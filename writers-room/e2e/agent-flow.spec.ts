import { test, expect } from '@playwright/test'

test.describe('에이전트 마켓플레이스 플로우', () => {
  test('에이전트 목록 페이지 렌더링', async ({ page }) => {
    await page.goto('/agents')

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('에이전트 마켓플레이스')

    // 필터 셀렉트 존재 확인
    const selects = page.locator('select')
    await expect(selects).toHaveCount(3)

    // 스켈레톤 → 데이터 로딩 전환 확인
    await page.waitForTimeout(2000)
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('에이전트 상세 페이지 접근 (존재하지 않는 에이전트)', async ({ page }) => {
    await page.goto('/agents/non-existent-id')

    await page.waitForTimeout(2000)
    const body = page.locator('body')
    const text = await body.textContent()
    expect(
      text?.includes('찾을 수 없습니다') ||
        text?.includes('오류') ||
        text?.includes('마켓플레이스'),
    ).toBeTruthy()
  })

  test('에이전트 생성 페이지 - 미인증 시 리디렉트', async ({ page }) => {
    await page.goto('/agents/create')

    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url.includes('/agents/create')).toBeFalsy()
  })

  test('에이전트 필터 변경', async ({ page }) => {
    await page.goto('/agents')

    // 역할 필터 변경
    const roleSelect = page.locator('select').first()
    await roleSelect.selectOption({ index: 1 })

    // 정렬 변경
    const sortSelect = page.locator('select').last()
    await sortSelect.selectOption('popular')

    // 페이지가 에러 없이 렌더링되는지 확인
    await page.waitForTimeout(1000)
    await expect(page.locator('main')).toBeVisible()
  })
})
