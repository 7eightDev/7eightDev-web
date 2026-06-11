/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/domain", "<rootDir>/application", "<rootDir>/infrastructure"],
  testPathIgnorePatterns: ["<rootDir>/infrastructure/db/generated/"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
