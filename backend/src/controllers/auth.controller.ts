import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config/env';
import { AuthRequest } from '../middleware/auth';

// Helper to generate token
function generateToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, config.JWT_SECRET, { expiresIn: '7d' });
}

// User Registration
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, schoolName } = req.body;

    if (!name || !email || !password || !schoolName) {
      return res.status(400).json({ error: 'Name, email, password, and school name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      schoolName: schoolName.trim(),
    });

    const savedUser = await newUser.save();
    const token = generateToken(savedUser.id, savedUser.email);

    return res.status(201).json({
      token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        schoolName: savedUser.schoolName,
        schoolAddress: savedUser.schoolAddress,
        schoolLogo: savedUser.schoolLogo,
        userAvatar: savedUser.userAvatar,
      },
    });
  } catch (err: any) {
    console.error('Registration controller error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// User Login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id, user.email);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        schoolName: user.schoolName,
        schoolAddress: user.schoolAddress,
        schoolLogo: user.schoolLogo,
        userAvatar: user.userAvatar,
      },
    });
  } catch (err: any) {
    console.error('Login controller error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Fetch Current User Details
export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (err: any) {
    console.error('getMe controller error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Update User Profile
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, password, schoolName, schoolAddress, schoolLogo, userAvatar } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (schoolName !== undefined) user.schoolName = schoolName.trim();
    if (schoolAddress !== undefined) user.schoolAddress = schoolAddress.trim();
    if (schoolLogo !== undefined) user.schoolLogo = schoolLogo.trim();
    if (userAvatar !== undefined) user.userAvatar = userAvatar.trim();

    if (email !== undefined) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== user.email) {
        // Verify email is not already taken
        const emailTaken = await User.findOne({ email: emailLower });
        if (emailTaken) {
          return res.status(400).json({ error: 'Email is already in use by another account.' });
        }
        user.email = emailLower;
      }
    }

    if (password !== undefined && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      schoolName: updatedUser.schoolName,
      schoolAddress: updatedUser.schoolAddress,
      schoolLogo: updatedUser.schoolLogo,
      userAvatar: updatedUser.userAvatar,
    });
  } catch (err: any) {
    console.error('updateProfile controller error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
