<h1 align="center">SAI</h1>

<p align="center">
  <a href="https://www.typescriptlang.org" target="_blank"><img src="https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white&style=flat" alt="TypeScript-Badge"></a>
  <a href="https://www.r-project.org/" target="_blank"><img src="https://img.shields.io/badge/R-276DC3.svg?logo=r&logoColor=white&style=flat" alt="R-Badge"></a>
  <img src="https://img.shields.io/badge/Rust-de6543.svg?logo=rust&logoColor=white&style=flat" alt="Rust-Badge">
</p>

## クイックスタート

```bash
git clone https://github.com/stkii/sai.git

cd sai/ && pnpm install

cd src-r/ && Rscript -e 'renv::restore()'

cd ../

RENV_PROJECT="$PWD/src-r" PATH="/usr/local/bin:$PATH" pnpm tauri dev
```

## ライセンス

このプロジェクトは [GPL-3.0](https://github.com/stkii/sai/blob/main/LICENSE) で公開しています。
