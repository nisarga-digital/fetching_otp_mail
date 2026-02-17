// @ts-check
import { defineConfig, devices, expect } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const config = {
  testDir: './tests',
  timeout: 40 * 1000,
  expect: {
    timeout: 5000
  },
  
  reporter: 'html',


  name : 'chrome',
      use: {

        browserName : 'chromium',
        headless : false,
        screenshot : 'on',
        video: 'retain-on-failure',
        ignoreHttpsErrors:true,
        permissions:['geolocation'],
        
        trace : 'on',//off,on,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
  },
};

export default config;
