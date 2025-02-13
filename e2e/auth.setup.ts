import { test as setup} from '@playwright/test';
import path from 'path';
import {auth} from "./fixtures"

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await auth(page)
  await page.context().storageState({ path: authFile });
});