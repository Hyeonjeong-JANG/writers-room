import { test, expect } from '@playwright/test'

test.describe('스토리 플로우', () => {
  test('랜딩 페이지에서 스토리 목록으로 이동', async ({ page }) => {
    await page.goto('/')

    // 랜딩 페이지 렌더링 확인
    await expect(page.locator('h1')).toContainText('AI 에이전트와 함께')

    // 스토리 탐색하기 클릭
    await page.click('text=스토리 탐색하기')
    await expect(page).toHaveURL('/stories')

    // 스토리 목록 페이지 확인
    await expect(page.locator('h1')).toContainText('스토리 탐색')
  })

  test('스토리 목록 페이지 필터 동작', async ({ page }) => {
    await page.goto('/stories')

    // 장르 필터 존재 확인
    await expect(page.getByText('로맨스', { exact: true })).toBeVisible()
    await expect(page.getByText('판타지', { exact: true })).toBeVisible()

    // 정렬 토글 확인
    await expect(page.getByText('최신순', { exact: true })).toBeVisible()
    await expect(page.getByText('인기순', { exact: true })).toBeVisible()

    // 장르 필터 클릭
    await page.getByText('판타지', { exact: true }).click()

    // 로딩 후 결과 확인 (빈 결과든 카드든)
    await page.waitForTimeout(1000)
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('스토리 상세 페이지 접근 (존재하지 않는 스토리)', async ({ page }) => {
    await page.goto('/stories/non-existent-id')

    // 스토리 없음 메시지 또는 에러 페이지 확인
    await page.waitForTimeout(2000)
    const body = page.locator('body')
    const text = await body.textContent()
    expect(
      text?.includes('찾을 수 없습니다') || text?.includes('오류') || text?.includes('404'),
    ).toBeTruthy()
  })

  test('스토리 생성 페이지 - 미인증 시 리디렉트', async ({ page }) => {
    await page.goto('/stories/create')

    // 미인증 사용자는 홈으로 리디렉트되어야 함
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url.includes('/stories/create')).toBeFalsy()
  })
})
