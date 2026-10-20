import { describe, expect, it } from "bun:test";
import {
  borders,
  colors,
  opacities,
  radii,
  shadows,
  spacing,
  transforms,
  transitions,
  typography,
} from "../../src/styles/tokens.stylex";

describe("tokens.stylex", () => {
  it("exports colors tokens", () => {
    expect(colors.background).toBeDefined();
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.accentHover).toBeDefined();
    expect(colors.accentForeground).toBeDefined();
    expect(colors.transparent).toBeDefined();
  });

  it("exports spacing and typography tokens", () => {
    expect(spacing.xs).toBeDefined();
    expect(spacing.sm).toBeDefined();
    expect(spacing.md).toBeDefined();
    expect(spacing.lg).toBeDefined();

    expect(typography.fontScript).toBeDefined();
    expect(typography.fontSans).toBeDefined();
    expect(typography.sizeBase).toBeDefined();
    expect(typography.sizeHero).toBeDefined();
  });

  it("exports layout and transition tokens", () => {
    expect(radii.md).toBeDefined();
    expect(shadows.subtle).toBeDefined();
    expect(borders.width).toBeDefined();
    expect(transitions.property).toBeDefined();
    expect(transitions.duration).toBeDefined();
    expect(transforms.hoverLift).toBeDefined();
    expect(transforms.active).toBeDefined();
    expect(opacities.disabled).toBeDefined();
  });
});
