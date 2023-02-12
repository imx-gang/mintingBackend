import express from 'express';
import controller from '../controllers/Auth';
import { Schemas, ValidateJoi } from '../middleware/Joi';

const router = express.Router();

router.post('/signup', ValidateJoi(Schemas.user.create), controller.signup);
router.post('/login', ValidateJoi(Schemas.user.login), controller.login);
router.post('/logout', controller.logout);
router.post('/logoutAll', controller.logoutAll);
router.post('/accessToken', controller.newAccessToken);
router.post('/refreshToken', controller.newRefreshToken);

export = router;
