import { disconnectDatabase } from "../src/config/database";

afterAll(async () => {
  await disconnectDatabase();
});

beforeEach(() => {
  // Reset test state before each test
});

afterEach(() => {
  // Cleanup after each test
});
