import dotenv from 'dotenv';

dotenv.config();

const MONGO_USERNAME = process.env.MONGO_USERNAME || '';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';
const MONGO_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@ac-cdbnyqi-shard-00-00.wehqpyz.mongodb.net:27017,ac-cdbnyqi-shard-00-01.wehqpyz.mongodb.net:27017,ac-cdbnyqi-shard-00-02.wehqpyz.mongodb.net:27017/?ssl=true&replicaSet=atlas-lmvl51-shard-0&authSource=admin&retryWrites=true&w=majority`;

const SERVER_PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 1337;

export const config = {
    mongo: {
        username: MONGO_USERNAME,
        password: MONGO_PASSWORD,
        url: MONGO_URL
    },
    server: {
        port: SERVER_PORT
    }
};
