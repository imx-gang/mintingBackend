const jwt = require('jsonwebtoken');
const models = require('../models');
const argon2 = require('argon2');
const { errorHandler, withTransaction } = require('../util');
const { HttpError } = require('../error');
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

const signup = errorHandler(
    withTransaction(async (req: Request, res: Response, next: NextFunction) => {
        const userDoc = models.User({
            _id: new mongoose.Types.ObjectId(),
            username: req.body.username,
            password: await argon2.hash(req.body.password)
        });
        const refreshTokenDoc = models.RefreshToken({
            _id: new mongoose.Types.ObjectId(),
            owner: userDoc.id
        });

        await userDoc.save();
        await refreshTokenDoc.save();

        const refreshToken = createRefreshToken(userDoc.id, refreshTokenDoc.id);
        const accessToken = createAccessToken(userDoc.id);

        return {
            id: userDoc.id,
            accessToken,
            refreshToken
        };
    })
);

const login = errorHandler(
    withTransaction(async (req: Request, res: Response, next: NextFunction) => {
        const userDoc = await models.User.findOne({ username: req.body.username }).select('+password').exec();
        if (!userDoc) {
            throw new HttpError(401, 'Wrong username or password');
        }
        await verifyPassword(userDoc.password, req.body.password);

        const refreshTokenDoc = models.RefreshToken({
            _id: new mongoose.Types.ObjectId(),
            owner: userDoc.id
        });

        await refreshTokenDoc.save();

        const refreshToken = createRefreshToken(userDoc.id, refreshTokenDoc.id);
        const accessToken = createAccessToken(userDoc.id);

        return {
            id: userDoc.id,
            accessToken,
            refreshToken
        };
    })
);

const newRefreshToken = errorHandler(
    withTransaction(async (req: Request, res: Response, next: NextFunction) => {
        const currentRefreshToken = await validateRefreshToken(req.body.refreshToken);
        const refreshTokenDoc = models.RefreshToken({
            _id: new mongoose.Types.ObjectId(),
            owner: currentRefreshToken.userId
        });

        await refreshTokenDoc.save();
        await models.RefreshToken.deleteOne({ _id: currentRefreshToken.tokenId });

        const refreshToken = createRefreshToken(currentRefreshToken.userId, refreshTokenDoc.id);
        const accessToken = createAccessToken(currentRefreshToken.userId);

        return {
            id: currentRefreshToken.userId,
            accessToken,
            refreshToken
        };
    })
);

const newAccessToken = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = await validateRefreshToken(req.body.refreshToken);
    const accessToken = createAccessToken(refreshToken.userId);

    return {
        id: refreshToken.userId,
        accessToken,
        refreshToken: req.body.refreshToken
    };
});

const logout = errorHandler(
    withTransaction(async (req: Request, res: Response, next: NextFunction) => {
        const refreshToken = await validateRefreshToken(req.body.refreshToken);
        await models.RefreshToken.deleteOne({ _id: refreshToken.tokenId });
        return { success: true };
    })
);

const logoutAll = errorHandler(
    withTransaction(async (req: Request, res: Response, next: NextFunction) => {
        const refreshToken = await validateRefreshToken(req.body.refreshToken);
        await models.RefreshToken.deleteMany({ owner: refreshToken.userId });
        return { success: true };
    })
);

const createAccessToken = (userId: BigInteger) => {
    return jwt.sign(
        {
            userId: userId
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: '10m'
        }
    );
};

const createRefreshToken = (userId: BigInteger, refreshTokenId: BigInteger) => {
    return jwt.sign(
        {
            userId: userId,
            tokenId: refreshTokenId
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: '30d'
        }
    );
};

const verifyPassword = async (hashedPassword: string, rawPassword: string) => {
    if (await argon2.verify(hashedPassword, rawPassword)) {
        // password matches
    } else {
        throw new HttpError(401, 'Wrong username or password');
    }
};

const validateRefreshToken = async (token: string) => {
    const decodeToken = () => {
        try {
            return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            // err
            throw new HttpError(401, 'Unauthorised');
        }
    };

    const decodedToken = decodeToken();
    const tokenExists = await models.RefreshToken.exists({ _id: decodedToken.tokenId, owner: decodedToken.userId });
    if (tokenExists) {
        return decodedToken;
    } else {
        throw new HttpError(401, 'Unauthorised');
    }
};

export default {
    signup,
    login,
    newRefreshToken,
    newAccessToken,
    logout,
    logoutAll
};
