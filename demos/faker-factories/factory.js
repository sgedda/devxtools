import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }),
    role: 'member',
    createdAt: faker.date.past({ years: 1 }),
    ...overrides
  };
}

export function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides });
}

export function createUsers(count, overrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides));
}
