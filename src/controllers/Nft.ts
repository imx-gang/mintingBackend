import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';

import { AlchemyProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { ImLogger, WinstonLogger } from '@imtbl/imlogging';
import { ImmutableMethodParams, ImmutableXClient } from '@imtbl/imx-sdk';

import env from '../config/client';
import { loggerConfig } from '../config/logging';

const provider = new AlchemyProvider(env.ethNetwork, env.alchemyApiKey);
const log: ImLogger = new WinstonLogger(loggerConfig);
const component = 'imx-bulk-mint-script';

const waitForTransaction = async (promise: Promise<string>) => {
    const txId = await promise;
    log.info(component, 'Waiting for transaction', {
        txId,
        etherscanLink: `https://goerli.etherscan.io/tx/${txId}`,
        alchemyLink: `https://dashboard.alchemyapi.io/mempool/eth-goerli/tx/${txId}`
    });
    const receipt = await provider.waitForTransaction(txId);
    if (receipt.status === 0) {
        throw new Error('Transaction rejected');
    }
    log.info(component, `Transaction Mined: ${receipt.blockNumber}`);
    return receipt;
};
const mintNft = async (req: Request, res: Response, next: NextFunction) => {
    const { walletAddress, numberOfTokens, tokenId } = req.body;

    const BULK_MINT_MAX = env.bulkMintMax;

    if (numberOfTokens >= Number(BULK_MINT_MAX)) throw new Error(`tried to mint too many tokens. Maximum ${BULK_MINT_MAX}`);

    console.log('tokenId');
    console.log(tokenId);

    const minter = await ImmutableXClient.build({
        ...env.client,
        signer: new Wallet(env.privateKey1).connect(provider)
    });

    log.info(component, 'MINTER REGISTRATION');
    const registerImxResult = await minter.registerImx({
        etherKey: minter.address.toLowerCase(),
        starkPublicKey: minter.starkPublicKey
    });

    if (registerImxResult.tx_hash === '') {
        log.info(component, 'Minter registered, continuing...');
    } else {
        log.info(component, 'Waiting for minter registration...');
        await waitForTransaction(Promise.resolve(registerImxResult.tx_hash));
    }

    log.info(component, `OFF-CHAIN MINT ${numberOfTokens} NFTS`);

    const tokens = Array.from({ length: numberOfTokens }, (_, i) => i).map((i) => ({
        id: (tokenId + i).toString(),
        blueprint: 'onchain-metadata'
    }));

    const payload: ImmutableMethodParams.ImmutableOffchainMintV2ParamsTS = [
        {
            contractAddress: env.tokenAddress, // NOTE: a mintable token contract is not the same as regular erc token contract
            users: [
                {
                    etherKey: walletAddress.toLowerCase(),
                    tokens
                }
            ]
        }
    ];

    const result = await minter.mintV2(payload);
    console.log(result);
    return res.send(result);
};

export default { mintNft };
