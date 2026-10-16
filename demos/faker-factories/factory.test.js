import { beforeEach, describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { createUser, createAdmin, createUsers } from './factory.js';

beforeEach(() => {
  faker.seed(123);
  faker.setDefaultRefDate('2026-01-01T00:00:00.000Z');
});

describe('createUser', () => {
  it('creates a valid user with all required fields', () => {
    const user = createUser();
    
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('createdAt');
    expect(user.role).toBe('member');
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('is deterministic with a seed', () => {
    const user1 = createUser();
    
    faker.seed(123);
    faker.setDefaultRefDate('2026-01-01T00:00:00.000Z');
    const user2 = createUser();
    
    expect(user1).toEqual(user2);
  });

  it('allows overriding specific fields', () => {
    const user = createUser({ name: 'Ada Lovelace', role: 'admin' });
    
    expect(user.name).toBe('Ada Lovelace');
    expect(user.role).toBe('admin');
    expect(user.email).toBeTruthy();
  });
});

describe('createAdmin', () => {
  it('creates a user with admin role', () => {
    const admin = createAdmin();
    
    expect(admin.role).toBe('admin');
  });
});

describe('createUsers', () => {
  it('creates multiple users', () => {
    const users = createUsers(3);
    
    expect(users).toHaveLength(3);
    users.forEach(user => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user.role).toBe('member');
    });
  });

  it('applies overrides to all users', () => {
    const users = createUsers(2, { role: 'admin' });
    
    expect(users).toHaveLength(2);
    users.forEach(user => {
      expect(user.role).toBe('admin');
    });
  });
});
