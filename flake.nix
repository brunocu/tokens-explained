# Dev environment for tokenizer-vis: Node 24 and the Playwright browsers.
#
# The nixpkgs input is pinned by REVISION (not by branch) so that an accidental
# `nix flake update` cannot move the Playwright browser revisions away from the
# exact @playwright/test version pinned in package.json.
#
# To bump: change the revision in the input URL below, run
# `nix flake update nixpkgs`, set the exact @playwright/test version in
# package.json to the new PLAYWRIGHT_NIX_VERSION, reinstall, and run
# `npm run check:env`.
#
# Why the three environment variables:
# - Playwright's own downloaded Chromium does not launch on NixOS (missing
#   shared libraries). The nixpkgs browsers do, and they are linked in one
#   directory per browser revision (chromium, chromium_headless_shell,
#   firefox, webkit and ffmpeg followed by a hyphen and the revision).
# - Playwright's host-requirements check cannot see libraries provided by Nix,
#   so it is skipped.
# - PLAYWRIGHT_NIX_VERSION lets scripts/check-env.mjs verify that the npm
#   Playwright version matches the browsers provided here.
{
  description = "tokenizer-vis dev shell: Node 24 and pinned Playwright browsers";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/c59305bab2065cfecc4944690d9eedbb56f3a9fa";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 ];
          env = {
            PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
            PLAYWRIGHT_NIX_VERSION = pkgs.playwright-driver.version;
          };
        };
      });
    };
}
