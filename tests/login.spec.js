/**
 * --------------------------------------------------------------
 * Test – Complete Browser Automation with Login + OTP
 * --------------------------------------------------------------
 */

// login.spec.js
const { test, expect } = require("@playwright/test");
import { initializeGmailAPI, getOtpFromGmail } from "./gmailOtpReader"

// Set global timeout for all tests in this file
test.setTimeout(4 * 60 * 1000);

// Helper function to remove overlay
async function removeOverlay(page) {
  try {
    await page.evaluate(() => {
      document
        .querySelectorAll(".alert-overlay, app-alert, .loading-overlay")
        .forEach((el) => {
          el.remove();
        });
    });
    console.log("[Overlay] Removed overlays via DOM manipulation");
  } catch (e) {
    // Silently fail if overlay doesn't exist
    console.log("[Overlay] Failed to remove overlay:", e.message);
  }
}


// Helper function to wait for overlay to disappear
async function waitForOverlayToDisappear(page, timeout = 15000) {
  try {
    // Wait for loading overlay to appear first (if it will)
    await page
      .waitForSelector(".loading-overlay", { state: "visible", timeout: 2000 })
      .catch(() => { });

    // Then wait for it to disappear
    await page.waitForSelector(".loading-overlay", {state: "hidden",timeout,});
    console.log("[Overlay] Loading overlay disappeared naturally");
    return true;
  } catch (e) {
    console.log("[Overlay] No loading overlay detected or already gone");
    return false;
  }
}

// Combined helper function
async function ensureNoOverlay(page) {
  // Combined approach: wait naturally, then force remove if needed
  await waitForOverlayToDisappear(page, 10000);
  await removeOverlay(page);
  await page.waitForTimeout(500);
}

/**
 * --------------------------------------------------------------
 * Main Test
 * --------------------------------------------------------------
 */
test("Login with OTP (FINAL)", async ({ browser }) => {
  const userName = "TestUser";
  let context;
  let page;

  try {
    // -----------------------------------------------------------------
    //  Initialize Gmail API (once per test file)
    // -----------------------------------------------------------------
    console.log(`[${userName}] Initialising Gmail API`);
    await initializeGmailAPI();

    // -----------------------------------------------------------------
    //  Browser context & page
    // -----------------------------------------------------------------
    context = await browser.newContext({
      permissions: ["geolocation"],
      geolocation: { latitude: 19.4326, longitude: -99.1332 },
      locale: "en-US",
    });

    page = await context.newPage();

    // -----------------------------------------------------------------
    //  Open the login page – wait for the form to be ready
    // -----------------------------------------------------------------
    console.log(`[${userName}] Navigating to login page`);
    await page.goto("https://main.d36le5xjrf00ot.amplifyapp.com/auth/login", {waitUntil: "networkidle",});
    console.log(`[${userName}] Page Title: ${await page.title()}`);

    await ensureNoOverlay(page);

    // -----------------------------------------------------------------
    //  Handle initial popups/backdrops
    // -----------------------------------------------------------------
    // Wait for backdrop(s) to disappear
    const backdrops = page.locator(".MuiBackdrop-root");
    const backdropCount = await backdrops.count();
    for (let i = 0; i < backdropCount; i++) {
      await backdrops.nth(i).waitFor({ state: "hidden" });
    }

    // Try clicking 'Cerrar' button if present
    const cerrarButton = page.getByRole("button", { name: "Cerrar" });
    if (await cerrarButton.isVisible().catch(() => false))
      { 
        await cerrarButton.click();
      console.log(`[${userName}] Closed initial popup`);
    }

    // -----------------------------------------------------------------
    //  Fill credentials
    // -----------------------------------------------------------------
    console.log(`[${userName}] Typing credentials`);
    await page.locator('[formcontrolname="email"]').fill(process.env.TEST_EMAIL || "nnisarga871+customer02@gmail.com");
    await page.locator('[formcontrolname="password"]').fill(process.env.TEST_PASSWORD || "Test@12345");
    console.log(`[${userName}] Credentials entered`);

    // -----------------------------------------------------------------
    //  Submit the form
    // -----------------------------------------------------------------
    const loginBtn = page.getByRole("button", { name: "Ingresar" });
    await loginBtn.click();
    console.log(`[${userName}] Login button clicked`);

    await ensureNoOverlay(page);

    // -----------------------------------------------------------------
    //  Wait for OTP page to load
    // -----------------------------------------------------------------
    await page.locator("//input[@id='mat-input-7']").first().waitFor({ timeout: 35000 });
    console.log( `[${userName}] OTP input boxes are visible - waiting for user to enter OTP...`,);

    // Locate all OTP input fields
    const otpInputs = page.locator("//input[contains(@id, 'mat-input')]");
    const otpCount = await otpInputs.count();
    console.log(`[${userName}] Found ${otpCount} OTP input fields`);

    // Wait until all OTP fields are filled (manual entry)
    await page.waitForFunction(() => { const inputs = document.querySelectorAll("input[id*='mat-input']");
        return Array.from(inputs).every((input) => input.value.trim() !== "");}, { timeout: 120000 },);

    console.log(`[${userName}] All OTP fields are filled - clicking Verificar button...`,);

    // Click Verificar button
    await page.getByRole("button", { name: "Verificar" }).click();
    console.log(`[${userName}] TOTP verified`);

    await ensureNoOverlay(page);

    // -----------------------------------------------------------------
    //  Wait for page to load after verification
    // -----------------------------------------------------------------
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => { });
    await page.waitForTimeout(5000);

    // -----------------------------------------------------------------
    //  Try to click dashboard button if it exists
    // -----------------------------------------------------------------
    try {
      await page.getByRole("button", { name: "Continuar al dashboard" }).click({ timeout: 10000 });
      console.log(`[${userName}] Clicked dashboard button`);
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => { });
    } catch (e) {
      console.log(`[${userName}] Dashboard button not found, continuing...`);
    }

    // Wait for dashboard to fully load
    await page.waitForTimeout(5000);
    console.log(`[${userName}] On dashboard`);

    // -----------------------------------------------------------------
    //  Navigate through sections
    // -----------------------------------------------------------------

    // Account Balance Section
    try {
      await page.locator('a:has-text("account_balance")').first().click({ timeout: 10000, force: true });
      console.log(`[${userName}] Clicked account balance`);
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`[${userName}] Account balance click failed: ${e.message}`);
    }

    // Saldo y perfil
    try {
      await page.getByRole("link", { name: "Saldo y perfil" }).click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      console.log(`[${userName}] Navigated to Saldo y perfil`);
    } catch (e) {
      console.log(`[${userName}] Saldo y perfil not found`);
    }

    // Estados de cuenta
    try {
      await page.getByRole("link", { name: "Estados de cuenta" }).click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      console.log(`[${userName}] Navigated to Estados de cuenta`);
    } catch (e) {
      console.log(`[${userName}] Estados de cuenta not found`);
    }

    // -----------------------------------------------------------------
    //  SPEI Transfer Section
    // -----------------------------------------------------------------
    try {
      console.log(`[${userName}] Starting SPEI section...`);
      await page.locator('a:has-text("sync_alt")').first().click({ timeout: 5000 });
      await page.waitForTimeout(1500);

      await page.getByRole("link", { name: "SPEI" }).click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log(`[${userName}] Navigated to SPEI`);

      await ensureNoOverlay(page);

      const accountSPEI = page.locator("text=CUENTA BÁSICA").first();
      if (await accountSPEI.isVisible({ timeout: 3000 }).catch(() => false)) {
        await accountSPEI.click();
        await page.waitForTimeout(2000);
        console.log(`[${userName}] Clicked SPEI account`);

        // IMPORTANT: Navigate back to dashboard/home before moving to next section
        console.log(`[${userName}] Navigating back to dashboard...`);

        // Try to click a back button or home icon
        try {
          const backButton = page.locator('button:has-text("Volver"), button:has-text("Atrás"), mat-icon:has-text("arrow_back")', ).first();
          if (
            await backButton.isVisible({ timeout: 2000 }).catch(() => false)
          ) {
            await backButton.click();
            await page.waitForTimeout(2000);
            console.log(`[${userName}] Clicked back button`);
          }
        } catch (e) {
          console.log(`[${userName}] No back button found`);
        }

        // Alternative: Click on dashboard/home link
        try {
          const homeLink = page.locator('a:has-text("home"), a[href*="dashboard"], mat-icon:has-text("home")',).first();
          if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await homeLink.click({ force: true });
            await page.waitForTimeout(2000);
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => { });
            console.log(`[${userName}] Clicked home/dashboard link`);
          }
        } catch (e) {
          console.log(`[${userName}] No home link found`);
        }

        await ensureNoOverlay(page);
        await page.waitForTimeout(2000);
      }

      console.log(`[${userName}] SPEI section completed`);
    } catch (e) {
      console.log(`[${userName}] SPEI section skipped: ${e.message}`);
    }

    // -----------------------------------------------------------------
    //  Eplata Transfer Section
    // -----------------------------------------------------------------
    try {
      console.log(`[${userName}] Starting Eplata section...`);

      // Ensure we're in a clean state
      await page.waitForTimeout(2000);
      await ensureNoOverlay(page);

      // Force a fresh navigation to clear any cached state
      console.log(`[${userName}] Opening transfers menu for Eplata...`);
      await page.locator('a:has-text("sync_alt")').first().click({ timeout: 15000 });
      await page.waitForTimeout(2000);

      await page.getByRole("link", { name: "Transferencia eplata" }).click({ timeout: 15000 });
      await page.waitForTimeout(2000);
      console.log(`[${userName}] Navigated to Eplata transfer`);

      await ensureNoOverlay(page);

      const accountEplata = page.locator("text=CUENTA BÁSICA").first();
      if (await accountEplata.isVisible({ timeout: 3000 }).catch(() => false)) {
        await accountEplata.click();
        await page.waitForTimeout(1000);
        console.log(`[${userName}] Clicked Eplata account`);

        // Transfer flow starts here
        await page.getByText("****").click({ timeout: 5000 });
        await page.waitForTimeout(500);

        await page.getByText("Buscar en cuentas favoritas").click({ timeout: 5000 });
        await page.waitForTimeout(500);

        await page.getByRole("combobox", { name: "Buscar en cuentas favoritas" }).fill("nisha");
        await page.waitForTimeout(500);

        await page.getByText("nisha").click({ timeout: 5000 });
        await page.waitForTimeout(500);

        await page.getByRole("textbox", { name: "Importe (en MXN)" }).click({ timeout: 5000 });
        await page.getByRole("textbox", { name: "Importe (en MXN)" }).fill("$0.111");
        await page.waitForTimeout(500);

        await page.getByText("Concepto").click({ timeout: 5000 });
        await page.getByRole("textbox", { name: "Concepto" }).fill("send money");
        await page.waitForTimeout(500);

        // Click first Solicitar to trigger email
        await page.getByRole("button", { name: "Solicitar" }).click({ timeout: 5000 });

        console.log( `[${userName}] Transfer requested. Waiting for token input...`,);

        // Wait for Token input field to appear
        const tokenInput = page.getByLabel("Token", { exact: false });
        await tokenInput.waitFor({ timeout: 30000 });

        console.log(`[${userName}] Token input detected. Waiting for email...`);

        // Small delay to allow email delivery
        await page.waitForTimeout(5000);

        // Fetch OTP from Gmail
        const transferOtp = await getOtpFromGmail({
          maxRetries: 20,
          retryDelay: 5000,
          maxAgeMinutes: 2,
        });

        console.log(`[${userName}] Transfer OTP received: ${transferOtp}`);

        // Fill OTP into Token field
        await tokenInput.fill(transferOtp);

        console.log(`[${userName}] Transfer OTP filled into Token field`);
        
        await page.getByRole('button', { name: 'Enviar' }).click();
        await page.getByRole('button', { name: 'Ir a inicio' }).click();
        // Click Solicitar AGAIN to confirm transfer
        await page.getByRole("button", { name: "Solicitar" }).click({ timeout: 5000 });

        console.log(`[${userName}] Transfer completed successfully`);

        console.log(`[${userName}] Transfer request submitted, waiting for token...`, );

        console.log(`[${userName}] Eplata transfer flow completed`);
      } else {
        console.log(`[${userName}] CUENTA BÁSICA not found - checking current URL`,);
        console.log(`[${userName}] Current URL: ${page.url()}`);
      }
    } catch (e) {
      console.log(`[${userName}] Eplata section skipped: ${e.message}`);
      console.log(`[${userName}] Current URL at error: ${page.url()}`);
    }

    // -----------------------------------------------------------------
    //  Mass Transfers Section
// -----------------------------------------------------------------
try {
  console.log(`[${userName}] Starting Mass Transfers section...`);

  await page.waitForTimeout(2000);
  await ensureNoOverlay(page);

  await page.locator('a:has-text("sync_alt")').first().click({ timeout: 10000, force: true });
  await page.waitForTimeout(2000);

  await page.getByRole("link", { name: "Transferencias Masivas" }).click({ timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'Crear transferencia masiva' }).click();
  await page.waitForTimeout(2000);
  await ensureNoOverlay(page);

  // File upload
  const filePath = 'C:\\Users\\Orcon\\Downloads\\layout 9.xlsx';
  const fileInput = page.locator('input[type="file"]').first();

  await page.evaluate(() => {
    const input = document.querySelector('input[type="file"]');
    if (input) {
      input.removeAttribute('hidden');
      input.style.display = 'block';
      input.style.visibility = 'visible';
      input.style.opacity = '1';
      input.style.position = 'fixed';
      input.style.top = '0';
      input.style.left = '0';
      input.style.zIndex = '9999';
    }
  });

  await fileInput.setInputFiles(filePath);
  console.log(`[${userName}] Excel file set on input`);

  await page.waitForTimeout(3000);

  const fileNameVisible = await page.locator(`text=layout 9`).isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`[${userName}] File name visible on page: ${fileNameVisible}`);

  await page.waitForTimeout(3000);

  const siguienteBtn = page.getByRole('button', { name: 'Siguiente' });
  await siguienteBtn.waitFor({ state: 'visible', timeout: 15000 });
  await siguienteBtn.click();
  console.log(`[${userName}] Clicked Siguiente`);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  await page.getByRole('button', { name: 'Procesar' }).click();
  console.log(`[${userName}] Clicked Procesar`);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  await page.getByRole('combobox', { name: 'Cuenta ordenante *' }).click();
  await page.waitForTimeout(1000);

  await page.getByRole('option', { name: '****' }).first().click();
  await page.waitForTimeout(1000);

  // Click Solicitar — this triggers the token email
  await page.getByRole('button', { name: 'Solicitar' }).click();
  console.log(`[${userName}] Solicitar clicked — waiting for token input...`);

  // ADDED: Wait for Token input field to appear (same as Eplata)
  const massTokenInput = page.getByLabel("Token", { exact: false });
  await massTokenInput.waitFor({ timeout: 30000 });
  console.log(`[${userName}] Token input detected. Waiting for email...`);

  // ADDED: Small delay to allow email delivery
  await page.waitForTimeout(5000);

  // ADDED: Fetch OTP from Gmail (same call as Eplata)
  const massTransferOtp = await getOtpFromGmail({
    maxRetries: 20,
    retryDelay: 5000,
    maxAgeMinutes: 2,
  });

  console.log(`[${userName}] Mass transfer OTP received: ${massTransferOtp}`);

  // ADDED: Fill OTP into Token field
  await massTokenInput.fill(massTransferOtp);
  console.log(`[${userName}] Mass transfer OTP filled into Token field`);

  // ADDED: Submit with Enviar (same pattern as Eplata)
  await page.getByRole('button', { name: 'Realizar transferencias' }).click();
  console.log(`[${userName}] Realizar transferencias clicked — Mass transfer OTP submitted`);

  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  console.log(`[${userName}] Mass Transfers section COMPLETED`);

} catch (e) {
  console.log(`[${userName}] Mass transfers failed: ${e.message}`);
  console.log(`[${userName}] URL at failure: ${page.url()}`);
}

    // -----------------------------------------------------------------
    //  Logout Section
    // -----------------------------------------------------------------
    try {
      console.log(`[${userName}] Starting logout process...`);

      if (!page.isClosed()) {
        await page.waitForTimeout(2000);
        await ensureNoOverlay(page);

        await page.getByLabel("Perfil de usuario").click({ timeout: 10000, force: true });
        await page.waitForTimeout(1000);
        await page.getByRole("button", { name: "Cerrar Sesión" }).click({ timeout: 5000 });
        console.log(`[${userName}] Logout button clicked`);

        // Wait and click the confirmation close button
        await page.waitForTimeout(1000);
        await page.getByRole("button", { name: "Cerrar" }).click({ timeout: 5000 });
        console.log(`[${userName}] Confirmation close button clicked`);

        // Wait for navigation back to login page
        await page.waitForTimeout(2000);
        await page.waitForURL("**/auth/login", { timeout: 10000 }).catch(() => { });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => { });

        // Verify we're back at login page without clicking
        const emailExists = await page.locator('[formcontrolname="email"]').isVisible({ timeout: 5000 }).catch(() => false);

        if (emailExists) {
          console.log(`[${userName}] LOGGED OUT SUCCESSFULLY - Back at login page`,);
        } else {
          console.log(`[${userName}] Logout completed but login page verification uncertain`,);
        }

        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log(`[${userName}] Logout process failed or incomplete: ${e.message}`,);
    }

    // -----------------------------------------------------------------
    //  Test Completion
    // -----------------------------------------------------------------
    console.log(`[${userName}] ========================================`);
    console.log(`[${userName}] TEST COMPLETED SUCCESSFULLY`);
    console.log(`[${userName}] ========================================`);
  } catch (error) {
    console.error(`[${userName}] TEST FAILED with error: ${error.message}`);
    console.error(error.stack);
    throw error;
  } finally {
    // -----------------------------------------------------------------
    //  Cleanup - Ensure cleanup happens even if test fails
    // -----------------------------------------------------------------
    console.log(`[${userName}] Starting cleanup...`);

    try {
      if (page && !page.isClosed()) {
        await page.close();
        console.log(`[${userName}] Page closed`);
      }
    } catch (e) {
      console.log(`[${userName}] Page close error: ${e.message}`);
    }

    try {
      if (context) {
        await context.close();
        console.log(`[${userName}] Context closed`);
      }
    } catch (e) {
      console.log(`[${userName}] Context close error: ${e.message}`);
    }

    // REMOVED browser.close() - Playwright handles this automatically
    console.log(`[${userName}] Cleanup completed`);
  }
});
