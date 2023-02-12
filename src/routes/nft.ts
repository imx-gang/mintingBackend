import express from 'express';
import controller from '../controllers/Nft';

const router = express.Router();

router.post('/mintNft', controller.mintNft);

export = router;
