{
  description = "Chapter 0 - Local-first in-browser document reader";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            imagemagick
          ];
          # TODO: This won't work on non-linux-x64 systems.
          shellHook = ''
            export BIOME_BINARY="@biomejs/cli-linux-x64-musl/biome"
          '';
        };
      }
    );
}
