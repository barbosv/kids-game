"""Browser checks for the Ranger Park slice and the Frogger entry point."""

from __future__ import annotations

import sys
from playwright.sync_api import Page, expect

BASE = "http://127.0.0.1:4173"
CAMPSITE = {
    "campsite-explorer-1": {"oak": 2, "pine": 3, "cedar": 1},
    "campsite-explorer-2": {"maple": 4, "birch": 4},
    "campsite-explorer-3": {"north": 5, "south": 3, "gate": 2},
}
TRAIL = {
    "trail-explorer-1": ["meadow", "bridge"],
    "trail-explorer-2": ["lake", "dock"],
    "trail-explorer-3": ["hill", "switchback"],
}
LOOKOUT = {
    "lookout-explorer-1": [("bench", "r0c0"), ("sign", "r0c1")],
    "lookout-explorer-2": [("bench", "r0c1"), ("sign", "r0c2")],
    "lookout-explorer-3": [("bench", "r0c0"), ("sign", "r1c0")],
}


def track(page: Page) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    failed: list[str] = []

    def on_page_error(error: object) -> None:
        errors.append(str(error))

    def on_console(message: object) -> None:
        if getattr(message, "type", None) == "error":
            errors.append(message.text)

    def on_response(response: object) -> None:
        status = getattr(response, "status", 200)
        url = getattr(response, "url", "")
        if status >= 400 and "favicon" not in url:
            failed.append(f"{status} {url}")

    page.on("pageerror", on_page_error)
    page.on("console", on_console)
    page.on("response", on_response)
    return errors, failed


def assert_clean(errors: list[str], failed: list[str]) -> None:
    assert errors == [], errors
    assert failed == [], failed


def attr(page: Page, name: str) -> str:
    value = page.locator("#app").get_attribute(name)
    assert value is not None, name
    return value


def enter(page: Page, profile_id: str) -> None:
    page.locator(f'[data-action="enter"][data-profile-id="{profile_id}"]').click()
    page.wait_for_selector("#park-stage canvas")
    expect(page.locator("#app")).to_have_attribute("data-profile-id", profile_id)


def welcome_and_collect(page: Page) -> None:
    page.locator('.mission-panel [data-action="welcome"]').click()
    expect(page.locator("#app")).to_have_attribute("data-intro", "collect")
    page.locator('.mission-panel [data-action="walk"]').click()
    page.wait_for_function("document.querySelector('#app')?.dataset.supplies === '3'")


def solve_campsite(page: Page, mission_id: str) -> None:
    counts = CAMPSITE[mission_id]
    for group, count in counts.items():
        button = page.locator(f'[data-action="place"][data-group="{group}"]')
        for _ in range(count):
            button.click()
    page.locator('.mission-panel [data-action="check"]').click()
    expect(page.locator("#app")).to_have_attribute("data-phase", "planValid")


def solve_trail(page: Page, mission_id: str) -> None:
    page.locator('[data-action="clear-route"]').click()
    for segment in TRAIL[mission_id]:
        page.locator(f'[data-action="toggle-segment"][data-segment="{segment}"]').click()
    page.locator('.mission-panel [data-action="check"]').click()
    expect(page.locator("#app")).to_have_attribute("data-phase", "planValid")


def solve_lookout(page: Page, mission_id: str) -> None:
    page.locator('[data-action="clear-layout"]').click()
    for facility, cell in LOOKOUT[mission_id]:
        page.locator(f'[data-action="select-facility"][data-facility="{facility}"]').click()
        page.locator(f'[data-action="place-cell"][data-cell="{cell}"]').click()
    page.locator('.mission-panel [data-action="check"]').click()
    expect(page.locator("#app")).to_have_attribute("data-phase", "planValid")


def build_current(page: Page) -> None:
    page.locator('.mission-panel [data-action="build"]').click()


def collect_more(page: Page) -> None:
    page.locator('[data-action="walk"][data-node="meadow"]').last.click()
    page.wait_for_function("Number(document.querySelector('#app')?.dataset.supplies) >= 3")


def test_ranger_flow(page: Page) -> None:
    errors, failed = track(page)
    page.goto(BASE)
    expect(page).to_have_title("Ranger Park")
    expect(page.locator("#app")).to_have_attribute("data-screen", "profiles")
    expect(page.get_by_role("heading", name="Ranger Park")).to_be_visible()
    enter(page, "ranger-1")
    welcome_and_collect(page)
    supplies = attr(page, "data-supplies")
    page.locator('.mission-panel [data-action="start-challenge"]').click()
    mission = attr(page, "data-mission-id")
    assert mission == "campsite-explorer-1", mission
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('[data-action="place"][data-group="oak"]').click()
    page.locator('.mission-panel [data-action="check"]').click()
    feedback = page.locator("[data-feedback]").inner_text()
    assert "Pine tent" in feedback or "needs" in feedback, feedback
    expect(page.locator("#app")).to_have_attribute("data-supplies", supplies)
    expect(page.locator("#app")).to_have_attribute("data-phase", "challenging")
    for _ in range(6):
        page.locator('[data-action="remove"][data-group="oak"]').click()
    solve_campsite(page, mission)
    build_current(page)
    expect(page.locator("#app")).to_have_attribute("data-campsite", "built")
    expect(page.locator("#app")).to_have_attribute("data-supplies", "0")
    expect(page.locator("#app")).to_have_attribute("data-badges", "badge-campsite")

    collect_more(page)
    page.locator('.mission-panel [data-action="start-challenge"]').click()
    trail_id = attr(page, "data-mission-id")
    page.locator('[data-action="toggle-segment"][data-segment="mud"]').click()
    page.locator('.mission-panel [data-action="check"]').click()
    assert "closed" in page.locator("[data-feedback]").inner_text().lower()
    expect(page.locator("#app")).to_have_attribute("data-supplies", "3")
    solve_trail(page, trail_id)
    build_current(page)
    expect(page.locator("#app")).to_have_attribute("data-trail", "built")

    collect_more(page)
    page.locator('.mission-panel [data-action="start-challenge"]').click()
    lookout_id = attr(page, "data-mission-id")
    page.locator('[data-action="select-facility"][data-facility="bench"]').click()
    page.locator('[data-action="place-cell"][data-cell="r1c0"]').click()
    page.locator('.mission-panel [data-action="check"]').click()
    assert page.locator("[data-feedback]").inner_text() != ""
    expect(page.locator("#app")).to_have_attribute("data-phase", "challenging")
    expect(page.locator("#app")).to_have_attribute("data-supplies", "3")
    solve_lookout(page, lookout_id)
    build_current(page)
    expect(page.locator("#app")).to_have_attribute("data-phase", "complete")
    expect(page.locator("#app")).to_have_attribute("data-lookout", "built")
    expect(page.get_by_text("The park is open")).to_be_visible()

    page.locator('[data-action="start-replay"][data-family="campsite"]').click()
    replay_id = attr(page, "data-mission-id")
    assert replay_id != "campsite-explorer-1"
    solve_campsite(page, replay_id)
    coins = int(attr(page, "data-coins"))
    page.locator('[data-action="finish-replay"]').click()
    expect(page.locator("#app")).to_have_attribute("data-phase", "complete")
    assert int(attr(page, "data-coins")) == coins + 2
    page.locator('[data-action="buy"][data-decoration="flowers"]').click()
    assert "flowers" in attr(page, "data-decorations")

    page.locator('[data-action="switch-profile"]').click()
    enter(page, "ranger-2")
    expect(page.locator("#app")).to_have_attribute("data-campsite", "ready")
    expect(page.locator("#app")).to_have_attribute("data-badges", "")
    expect(page.locator("#app")).to_have_attribute("data-supplies", "0")
    expect(page.locator("#app")).to_have_attribute("data-intro", "welcome")
    welcome_and_collect(page)
    page.locator('.mission-panel [data-action="start-challenge"]').click()
    kept = attr(page, "data-mission-id")
    assert kept == "campsite-trailblazer-1", kept
    page.locator('[data-action="open-parent"]').last.click()
    page.locator('[data-action="set-band"]').select_option("pathfinder")
    page.locator('[data-action="close-parent"]').click()
    expect(page.locator("#app")).to_have_attribute("data-band", "pathfinder")
    expect(page.locator("#app")).to_have_attribute("data-mission-band", "trailblazer")
    expect(page.locator("#app")).to_have_attribute("data-mission-id", kept)
    page.reload()
    enter(page, "ranger-2")
    expect(page.locator("#app")).to_have_attribute("data-mission-id", kept)
    expect(page.locator("#app")).to_have_attribute("data-mission-band", "trailblazer")
    expect(page.locator("#app")).to_have_attribute("data-band", "pathfinder")
    expect(page.locator("#app")).to_have_attribute("data-phase", "challenging")
    expect(page.locator("#app")).to_have_attribute("data-supplies", "3")
    assert_clean(errors, failed)


def test_viewports(browser: object) -> None:
    for width, height in ((1024, 768), (390, 844)):
        context = browser.new_context(viewport={"width": width, "height": height})  # type: ignore[attr-defined]
        page = context.new_page()
        errors, failed = track(page)
        page.goto(BASE)
        button = page.locator('[data-action="enter"][data-profile-id="ranger-1"]')
        box = button.bounding_box()
        assert box is not None
        assert box["height"] >= 44, (width, box)
        assert box["width"] >= 44
        button.click()
        page.wait_for_selector("#park-stage canvas")
        action = page.locator(".mission-panel .action")
        action.scroll_into_view_if_needed()
        action_box = action.bounding_box()
        assert action_box is not None
        assert action_box["height"] >= 44, (width, action_box)
        assert action_box["x"] >= 0
        assert action_box["x"] + 20 < width
        assert_clean(errors, failed)
        context.close()


def test_frogger(page: Page) -> None:
    errors, failed = track(page)
    page.goto(f"{BASE}/?game=frogger")
    expect(page).to_have_title("Frogger Interstate")
    page.wait_for_function("document.querySelector('#app')?.dataset.scenes?.includes('ModeSelectScene')")
    assert page.locator(".ranger-app").count() == 0 or page.locator("#app").get_attribute("data-game") == "frogger"
    expect(page.locator("#app")).to_have_attribute("data-game", "frogger")
    expect(page.locator("#app canvas")).to_be_visible()
    assert_clean(errors, failed)


def main() -> None:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        test_ranger_flow(page)
        page.close()
        test_viewports(browser)
        frogger = browser.new_page(viewport={"width": 1280, "height": 800})
        test_frogger(frogger)
        browser.close()
    print("e2e ok")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        raise
