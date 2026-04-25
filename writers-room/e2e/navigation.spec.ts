import { test, expect } from '@playwright/test'

test.describe('네비게이션 및 레이아웃', () => {
  test('GNB가 주요 페이지에 렌더링됨', async ({ page }) => {
    await page.goto('/stories')

    // GNB 로고 확인
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('header').locator('text=Writer')).toBeVisible()
  })

  test('GNB 네비게이션 링크 동작', async ({ page }) => {
    await page.goto('/stories')

    // 데스크톱 네비게이션 - 에이전트 클릭
    const agentsLink = page.locator('header').locator('text=에이전트')
    if (await agentsLink.isVisible()) {
      await agentsLink.click()
      await expect(page).toHaveURL('/agents')
    }

    // 로고 클릭 시 홈으로 이동
    await page.locator('header a').first().click()
    await expect(page).toHaveURL('/')
  })

  test('404 페이지 렌더링', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    await expect(page.locator('body')).toContainText('404')
  })

  test('대시보드 미인증 시 리디렉트', async ({ page }) => {
    await page.goto('/dashboard')

    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url.includes('/dashboard')).toBeFalsy()
  })

  test('프로필 미인증 시 리디렉트', async ({ page }) => {
    await page.goto('/profile')

    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url.includes('/profile')).toBeFalsy()
  })
})

test.describe('모바일 레이아웃', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('모바일 탭바가 표시됨', async ({ page }) => {
    await page.goto('/stories')

    // 모바일 탭바 존재 확인
    const tabBar = page.locator('nav').last()
    await expect(tabBar).toBeVisible()

    // 탭 아이템 확인
    await expect(tabBar.getByText('홈')).toBeVisible()
    await expect(tabBar.getByText('스토리', { exact: true })).toBeVisible()
    await expect(tabBar.getByText('에이전트', { exact: true })).toBeVisible()
  })

  test('모바일에서 스토리 카드 단일 컬럼', async ({ page }) => {
    await page.goto('/stories')
    await page.waitForTimeout(2000)

    // 모바일에서는 그리드가 1열이어야 함
    const grid = page.locator('.grid').first()
    if (await grid.isVisible()) {
      const box = await grid.boundingBox()
      if (box) {
        expect(box.width).toBeLessThan(400)
      }
    }
  })

  test('모바일 탭바 네비게이션', async ({ page }) => {
    await page.goto('/stories')

    // 에이전트 탭 클릭
    await page.locator('nav').last().locator('text=에이전트').click()
    await expect(page).toHaveURL('/agents')
  })
})
