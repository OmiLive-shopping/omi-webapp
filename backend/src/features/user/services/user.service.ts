import bcrypt from 'bcrypt';
import { unifiedResponse } from 'uni-response';

import { ERROR, SUCCESS } from '../../../constants/messages';
import { generateToken } from '../../../utils/generate-token.util';
import { UserRepository } from '../repositories/user.repository';
import { LoginInputTypes, RegisterInputTypes } from '../types/user.types';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async heartbeat() {
    return unifiedResponse(true, 'Ok, From user');
  }

  async login(loginInputObj: LoginInputTypes) {
    const { email, password } = loginInputObj;
    const user = await this.userRepository.findUserByEmail(email);

    if (!user) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      return unifiedResponse(false, 'Invalid credentials');
    }

    const token = generateToken(user.id, user.role?.name || 'user');
    return unifiedResponse(true, SUCCESS.LOGIN_SUCCESSFUL, { token });
  }

  async register(registerInputObj: RegisterInputTypes) {
    const { email, username, password, firstName } = registerInputObj;

    const existingUser = await this.userRepository.findUserByEmail(email);
    if (existingUser) {
      return unifiedResponse(false, ERROR.USER_EXISTS_WITH_EMAIL);
    }

    const existingUsername = await this.userRepository.findUserByUsername(username);
    if (existingUsername) {
      return unifiedResponse(false, 'User already exists with this username');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.userRepository.createUser({
      email,
      username,
      password: hashedPassword,
      firstName,
    });

    const token = generateToken(newUser.id, newUser.role?.name || 'user');
    return unifiedResponse(true, SUCCESS.REGISTRATION_SUCCESSFUL, {
      token,
      streamKey: newUser.streamKey,
    });
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }
    return unifiedResponse(true, SUCCESS.USER_FOUND, user);
  }

  async getPublicProfile(userId: string, viewerId?: string) {
    const user = await this.userRepository.findPublicProfile(userId, viewerId);
    if (!user) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }
    return unifiedResponse(true, SUCCESS.USER_FOUND, user);
  }

  async updateProfile(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatarUrl?: string;
      username?: string;
      email?: string;
    },
  ) {
    // Check if username is being updated and is available
    if (updateData.username) {
      const isAvailable = await this.userRepository.checkUsernameAvailable(
        updateData.username,
        userId,
      );
      if (!isAvailable) {
        return unifiedResponse(false, 'Username is already taken');
      }
    }

    // Check if email is being updated and is available
    if (updateData.email) {
      const isAvailable = await this.userRepository.checkEmailAvailable(updateData.email, userId);
      if (!isAvailable) {
        return unifiedResponse(false, ERROR.USER_EXISTS_WITH_EMAIL);
      }
    }

    // Extract only the fields that can be updated
    const { firstName, lastName, bio, avatarUrl } = updateData;
    const updatedUser = await this.userRepository.updateProfile(userId, {
      firstName,
      lastName,
      bio,
      avatarUrl,
    });

    return unifiedResponse(true, 'Profile updated successfully', updatedUser);
  }

  async followUser(followerId: string, targetUserId: string) {
    // Check if target user exists
    const targetUser = await this.userRepository.findUserById(targetUserId);
    if (!targetUser) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }

    // Check if already following
    const isFollowing = await this.userRepository.isFollowing(followerId, targetUserId);
    if (isFollowing) {
      return unifiedResponse(false, 'You are already following this user');
    }

    // Cannot follow yourself
    if (followerId === targetUserId) {
      return unifiedResponse(false, 'You cannot follow yourself');
    }

    await this.userRepository.followUser(followerId, targetUserId);
    return unifiedResponse(true, 'Successfully followed user');
  }

  async unfollowUser(followerId: string, targetUserId: string) {
    // Check if following
    const isFollowing = await this.userRepository.isFollowing(followerId, targetUserId);
    if (!isFollowing) {
      return unifiedResponse(false, 'You are not following this user');
    }

    await this.userRepository.unfollowUser(followerId, targetUserId);
    return unifiedResponse(true, 'Successfully unfollowed user');
  }

  async getFollowers(userId: string, page = 1, pageSize = 20) {
    const followers = await this.userRepository.getFollowers(userId, page, pageSize);
    return unifiedResponse(true, 'Followers retrieved successfully', followers);
  }

  async getFollowing(userId: string, page = 1, pageSize = 20) {
    const following = await this.userRepository.getFollowing(userId, page, pageSize);
    return unifiedResponse(true, 'Following list retrieved successfully', following);
  }

  async getStreamKey(userId: string) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }

    // Only return stream key if user has streamer role
    if (user.role?.name !== 'streamer' && user.role?.name !== 'admin') {
      return unifiedResponse(false, 'Only streamers can access stream keys');
    }

    return unifiedResponse(true, 'Stream key retrieved successfully', { 
      streamKey: user.streamKey,
      // Generate VDO.ninja room name from stream key
      vdoRoomName: `omi-${user.streamKey}`
    });
  }

  async regenerateStreamKey(userId: string) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      return unifiedResponse(false, ERROR.USER_NOT_FOUND);
    }

    // Only allow streamers and admins to regenerate stream keys
    if (user.role?.name !== 'streamer' && user.role?.name !== 'admin') {
      return unifiedResponse(false, 'Only streamers can regenerate stream keys');
    }

    const updatedUser = await this.userRepository.regenerateStreamKey(userId);
    
    return unifiedResponse(true, 'Stream key regenerated successfully', { 
      streamKey: updatedUser.streamKey,
      // Generate VDO.ninja room name from stream key
      vdoRoomName: `omi-${updatedUser.streamKey}`
    });
  }
}
