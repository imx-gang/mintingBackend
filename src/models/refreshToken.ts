import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken {
    name: string;
}

export interface IUserModel extends IRefreshToken, Document {}

const RefreshTokenSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model<IUserModel>('RefreshToken', RefreshTokenSchema);
