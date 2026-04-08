// Demo mode flag — when true, all services return mock data instead of calling APIs.
// Set to false once the Spring Boot backend is running.
export const DEMO_MODE = true;

let _counter = 1000;
export const generateId = () => `mock-${++_counter}`;

// Simulate async delay
export const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
