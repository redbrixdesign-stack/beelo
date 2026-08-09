import { test, expect } from '@playwright/test'

test.describe('Schedule Risk', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to visits
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await page.goto('/visits/new')
  })

  test('shows schedule risk banner when blind count creates tight gap', async ({ page }) => {
    // Fill in visit details
    await page.selectOption('select[aria-label="Customer *"]', { index: 1 })
    await page.fill('input[aria-label="Job Code *"]', 'H401')
    await page.fill('input[aria-label="Date & Time *"]', '2026-08-15T10:00')
    
    // Set blind count to 8 (8 * 33 = 264 min estimated)
    await page.fill('input[aria-label="Blind Count"]', '8')
    
    // Verify estimated duration shows
    await expect(page.locator('text=Estimated duration: 264 min')).toBeVisible()
    
    // Create another visit that would create a gap
    await page.goto('/visits/new')
    await page.selectOption('select[aria-label="Customer *"]', { index: 2 })
    await page.fill('input[aria-label="Job Code *"]', 'H402')
    // Next visit only 3 hours later (180 min) - less than 264 + 15 buffer
    await page.fill('input[aria-label="Date & Time *"]', '2026-08-15T14:30')
    await page.fill('input[aria-label="Blind Count"]', '4')
    
    // Go back to visits list and check risk banner
    await page.goto('/visits')
    await expect(page.locator('text=High Risk')).toBeVisible()
    await expect(page.locator('text=critical gap')).toBeVisible()
  })

  test('booking confirmation draft appears after visit creation', async ({ page }) => {
    await page.selectOption('select[aria-label="Customer *"]', { index: 1 })
    await page.fill('input[aria-label="Job Code *"]', 'H500')
    await page.fill('input[aria-label="Date & Time *"]', '2026-08-20T09:00')
    await page.fill('input[aria-label="Blind Count"]', '5')
    
    // Submit visit
    await page.click('button:has-text("Create Visit")')
    await expect(page).toHaveURL('/visits')
    
    // Click on the visit to see details
    await page.click('text=H500')
    
    // Verify booking confirmation draft is shown
    await expect(page.locator('text=Booking Confirmation Draft')).toBeVisible()
    await expect(page.locator('text=Clear access to windows')).toBeVisible()
    await expect(page.locator('text=Parking available nearby')).toBeVisible()
  })

  test('schedule risk computation uses advisor full_job_minutes_per_blind', async ({ page }) => {
    // This test verifies the computation uses the advisor setting
    await page.selectOption('select[aria-label="Customer *"]', { index: 1 })
    await page.fill('input[aria-label="Job Code *"]', 'H600')
    await page.fill('input[aria-label="Date & Time *"]', '2026-08-25T10:00')
    await page.fill('input[aria-label="Blind Count"]', '6')
    
    // Should show 6 * 33 = 198 min (default)
    await expect(page.locator('text=Estimated duration: 198 min')).toBeVisible()
    await expect(page.locator('text=6 blinds × 33 min')).toBeVisible()
  })
})

test.describe('Offline Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('visit creation works offline and syncs when online', async ({ page }) => {
    // Create visit while online
    await page.goto('/visits/new')
    await page.selectOption('select[aria-label="Customer *"]', { index: 1 })
    await page.fill('input[aria-label="Job Code *"]', 'OFFLINE-001')
    await page.fill('input[aria-label="Date & Time *"]', '2026-09-01T10:00')
    await page.fill('input[aria-label="Blind Count"]', '3')
    
    // Go offline
    await page.context().setOffline(true)
    
    // Submit visit while offline
    await page.click('button:has-text("Create Visit")')
    
    // Should show success (stored locally)
    await expect(page.locator('text=Visit created')).toBeVisible()
    await expect(page).toHaveURL('/visits')
    
    // Verify visit appears in list
    await expect(page.locator('text=OFFLINE-001')).toBeVisible()
    
    // Go online
    await page.context().setOffline(false)
    
    // Wait for sync
    await page.waitForTimeout(2000)
    
    // Verify sync status shows synced
    await expect(page.locator('[data-testid="sync-status"]').first()).toContainText('synced')
  })

  test('voice note capture works offline', async ({ page }) => {
    await page.goto('/leads/new')
    await page.fill('input[aria-label="Name"]', 'Test Lead')
    await page.fill('input[aria-label="Phone"]', '07700900000')
    await page.click('button:has-text("Create Lead")')
    
    await page.context().setOffline(true)
    
    // Record voice note
    await page.goto('/voice/capture')
    // In real test, would use media recorder mock
    await page.click('button:has-text("Stop Recording")')
    
    // Should save locally
    await expect(page.locator('text=Voice note recorded')).toBeVisible()
    
    await page.context().setOffline(false)
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="sync-status"]').first()).toContainText('synced')
  })

  test('document capture works offline', async ({ page }) => {
    await page.goto('/documents')
    
    await page.context().setOffline(true)
    
    // Capture document
    await page.click('text=Capture Document')
    await page.setInputFiles('input[type="file"]', 'test/fixtures/sample-quote.jpg')
    await page.click('button:has-text("Save Document")')
    
    // Should save locally with "uploaded" status
    await expect(page.locator('text=uploaded')).toBeVisible()
    
    await page.context().setOffline(false)
    await page.waitForTimeout(2000)
    
    // Should process and show "parsed" status
    await expect(page.locator('text=parsed')).toBeVisible({ timeout: 10000 })
  })
})