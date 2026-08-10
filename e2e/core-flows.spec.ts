import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  
  // Handle onboarding flow for new users
  if (page.url().includes('/onboarding')) {
    await completeOnboarding(page)
  }
  
  await expect(page).toHaveURL('/')
}

async function completeOnboarding(page: import('@playwright/test').Page) {
  // Step 1: Welcome - just click Next
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Profile')).toBeVisible({ timeout: 5000 })

  // Step 2: Profile - enter business name
  await page.fill('input[aria-label="Business Name *"]', 'Test Business')
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Business')).toBeVisible({ timeout: 5000 })

  // Step 3: Business - select employment model and set rates
  await page.selectOption('select[aria-label="Employment Model *"]', 'company_advisor')
  await page.fill('input[aria-label="Commission Rate (%) *"]', '15.25')
  await page.fill('input[aria-label="VAT Adjustment (%) *"]', '20')
  await page.fill('input[aria-label="Full Job Minutes per Blind *"]', '33')
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Consent')).toBeVisible({ timeout: 5000 })

  // Step 4: Consent - grant consent
  await page.click('button:has-text("I Agree")')
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Permissions')).toBeVisible({ timeout: 5000 })

  // Step 5: Permissions - click Next (permissions are requested by browser)
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Environment')).toBeVisible({ timeout: 5000 })

  // Step 6: Environment - select live
  await page.click('button:has-text("Live")')
  await page.click('button:has-text("Next")')
  await expect(page.locator('text=Tutorial')).toBeVisible({ timeout: 5000 })

  // Step 7: Tutorial - click Complete
  await page.click('button:has-text("Complete")')
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

async function createTestCustomer(page: import('@playwright/test').Page) {
  await page.goto('/customers/new')
  await page.fill('input[aria-label="Customer Number *"]', `CUST-TEST-${Date.now()}`)
  await page.fill('input[aria-label="Display Name"]', 'Test Customer')
  await page.fill('input[aria-label="Phone"]', '07700900001')
  await page.fill('textarea[aria-label="Address"]', '123 Test Street, Test Town, TT1 1TT')
  await page.click('button:has-text("Create Customer")')
  await expect(page).toHaveURL('/customers')
  await expect(page.locator('text=CUST-TEST-')).toBeVisible()
}

test.describe('Core User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.describe('Login → Create Visit → Add Outcome', () => {
    test('should create a visit and add an outcome', async ({ page }) => {
      await createTestCustomer(page)

      await page.goto('/visits/new')
      
      await page.selectOption('select[aria-label="Customer *"]', { label: /Test Customer/ })
      await page.fill('input[aria-label="Job Code *"]', 'TEST-JOB-001')
      await page.fill('input[aria-label="Date & Time *"]', '2026-08-15T10:00')
      await page.selectOption('select[aria-label="Appointment Type *"]', 'sales')
      await page.selectOption('select[aria-label="Job Source *"]', 'self_sold')
      await page.fill('input[aria-label="Blind Count"]', '4')
      
      await page.click('button:has-text("Create Visit")')
      await expect(page).toHaveURL('/visits')
      await expect(page.locator('text=TEST-JOB-001')).toBeVisible()

      await page.click('text=TEST-JOB-001')
      await expect(page).toHaveURL(/\/visits\/\d+/)

      await page.selectOption('select[aria-label="Outcome"]', 'Ordered')
      await page.fill('input[aria-label="Outcome Value (£)"]', '1500.00')
      await page.fill('input[aria-label="Discount (%)"]', '10')
      
      await page.click('button:has-text("Update")')
      await expect(page).toHaveURL('/visits')
      
      await page.click('text=TEST-JOB-001')
      await expect(page.locator('text=Ordered')).toBeVisible()
      await expect(page.locator('text=£1,500.00')).toBeVisible()
      await expect(page.locator('text=Discount: 10%')).toBeVisible()
    })

    test('should validate required fields on visit creation', async ({ page }) => {
      await page.goto('/visits/new')
      await page.click('button:has-text("Create Visit")')
      await expect(page.locator('text=Required')).toBeVisible()
    })
  })

  test.describe('Capture Document → Verify Thumbnail Loads', () => {
    test('should capture a document and show thumbnail in list', async ({ page }) => {
      await page.goto('/documents')
      
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles('/Users/muhammadasifriaz/Desktop/beelo/test/fixtures/sample-document.jpg')
      
      await page.click('button:has-text("Save Document")')
      await expect(page.locator('text=Document saved')).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL('/documents')

      await expect(page.locator('img[alt="Document"]').first()).toBeVisible({ timeout: 5000 })
    })

    test('should navigate to document detail and show full image', async ({ page }) => {
      await page.goto('/documents')
      
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles('/Users/muhammadasifriaz/Desktop/beelo/test/fixtures/sample-document.jpg')
      
      await page.click('button:has-text("Save Document")')
      await expect(page.locator('text=Document saved')).toBeVisible({ timeout: 10000 })
      
      await page.click('img[alt="Document"]').first()
      await expect(page).toHaveURL(/\/documents\/\d+/)
      await expect(page.locator('img').first()).toBeVisible()
    })
  })

  test.describe('Record Voice Note → Verify in Batch Review', () => {
    test('should record voice note and appear in batch review', async ({ page }) => {
      await page.goto('/voice/capture')
      
      await expect(page.locator('text=Record Voice Note')).toBeVisible()
      await expect(page.locator('text=Ready')).toBeVisible()

      await page.click('button[aria-label="Start recording"]')
      await expect(page.locator('text=Recording')).toBeVisible({ timeout: 5000 })
      
      await page.waitForTimeout(1000)
      
      await page.click('button[aria-label="Stop recording"]')
      await expect(page.locator('text=Voice note saved')).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL('/')

      await page.goto('/voice/review')
      await expect(page.locator('text=Batch Review')).toBeVisible()
      await expect(page.locator('text=Step: 1/3')).toBeVisible()
      await expect(page.locator('text=Screenshot')).toBeVisible()
    })

    test('should show offline indicator when offline', async ({ page }) => {
      await page.goto('/voice/capture')
      await page.context().setOffline(true)
      await expect(page.locator('text=Offline — recording saved locally')).toBeVisible()
      await page.context().setOffline(false)
    })
  })

  test.describe('Offline Capture → Online Sync → Verify in Supabase', () => {
    test('should create visit offline and sync when online', async ({ page }) => {
      await createTestCustomer(page)

      await page.goto('/visits/new')
      await page.selectOption('select[aria-label="Customer *"]', { label: /Test Customer/ })
      await page.fill('input[aria-label="Job Code *"]', 'OFFLINE-VISIT-001')
      await page.fill('input[aria-label="Date & Time *"]', '2026-09-01T10:00')
      await page.fill('input[aria-label="Blind Count"]', '3')

      await page.context().setOffline(true)
      
      await page.click('button:has-text("Create Visit")')
      await expect(page.locator('text=Visit created')).toBeVisible()
      await expect(page).toHaveURL('/visits')
      await expect(page.locator('text=OFFLINE-VISIT-001')).toBeVisible()

      await page.context().setOffline(false)
      await page.waitForTimeout(3000)

      await page.goto('/sync')
      await expect(page.locator('text=synced').first()).toBeVisible({ timeout: 10000 })
    })

    test('should capture document offline and sync when online', async ({ page }) => {
      await page.goto('/documents')
      
      await page.context().setOffline(true)
      
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles('/Users/muhammadasifriaz/Desktop/beelo/test/fixtures/sample-document.jpg')
      await page.click('button:has-text("Save Document")')
      
      await expect(page.locator('text=Document saved')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=uploaded').first()).toBeVisible({ timeout: 5000 })

      await page.context().setOffline(false)
      await page.waitForTimeout(3000)

      await page.goto('/sync')
      await expect(page.locator('text=synced').first()).toBeVisible({ timeout: 10000 })
    })

    test('should record voice note offline and sync when online', async ({ page }) => {
      await page.goto('/voice/capture')
      
      await page.context().setOffline(true)
      
      await page.click('button[aria-label="Start recording"]')
      await expect(page.locator('text=Recording')).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)
      await page.click('button[aria-label="Stop recording"]')
      
      await expect(page.locator('text=Voice note saved')).toBeVisible({ timeout: 10000 })

      await page.context().setOffline(false)
      await page.waitForTimeout(3000)

      await page.goto('/sync')
      await expect(page.locator('text=synced').first()).toBeVisible({ timeout: 10000 })
    })

    test('should show pending sync count when offline items exist', async ({ page }) => {
      await page.goto('/visits/new')
      await page.selectOption('select[aria-label="Customer *"]', { index: 1 })
      await page.fill('input[aria-label="Job Code *"]', 'PENDING-SYNC-001')
      await page.fill('input[aria-label="Date & Time *"]', '2026-09-15T10:00')
      await page.fill('input[aria-label="Blind Count"]', '2')

      await page.context().setOffline(true)
      await page.click('button:has-text("Create Visit")')
      await expect(page.locator('text=Visit created')).toBeVisible()

      await page.goto('/sync')
      await expect(page.locator('text=pending').first()).toBeVisible()
      
      await page.context().setOffline(false)
      await page.waitForTimeout(3000)
      await expect(page.locator('text=synced').first()).toBeVisible({ timeout: 10000 })
    })
  })
})

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/visits')
    await expect(page).toHaveURL('/login')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
  })
})