import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  schoolName: string;
  schoolAddress?: string;
  schoolLogo?: string;
  userAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    schoolName: { type: String, required: true },
    schoolAddress: { type: String, default: '' },
    schoolLogo: { type: String, default: 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg' },
    userAvatar: { type: String, default: 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg' }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
