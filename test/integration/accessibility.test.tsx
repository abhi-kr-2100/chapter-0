import { describe, expect, it } from "bun:test";
import axe from "axe-core";
import { EmptyState } from "../../src/components/library/EmptyState";
import { Button } from "../../src/components/ui/button";
import { UpdateBanner } from "../../src/components/ui/UpdateBanner";
import { setupDomFixture } from "../fixtures/dom";

describe("Component Accessibility (Integration via axe-core)", () => {
  const fixture = setupDomFixture();

  it("ensures Button component satisfies WCAG 2.1 AA accessibility standards", async () => {
    await fixture.render(
      <main>
        <Button type="button">Accessible Action</Button>
        <Button type="button" disabled variant="default">
          Disabled Action
        </Button>
      </main>,
    );

    const results = await axe.run(fixture.container, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("ensures EmptyState satisfies landmark and heading accessibility rules", async () => {
    await fixture.render(
      <main>
        <EmptyState />
      </main>,
    );

    const results = await axe.run(fixture.container, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("ensures UpdateBanner satisfies WCAG 2.1 AA accessibility standards", async () => {
    await fixture.render(
      <main>
        <h1>Main Page Heading</h1>
        <UpdateBanner onReload={() => {}} onDismiss={() => {}} />
      </main>,
    );

    const results = await axe.run(fixture.container, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });

    expect(results.violations).toEqual([]);
  });
});
