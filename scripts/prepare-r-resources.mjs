import { spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 配布先に renv のキャッシュへのリンクや開発時の絶対パスを持ち込まない。
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'src-tauri/resources/r');
const temporary = await mkdtemp(join(tmpdir(), 'sai-r-bundle-'));
async function makeWritable(path) {
  const info = await stat(path);
  await chmod(path, info.mode | 0o200);
  if (info.isDirectory()) {
    for (const name of await readdir(path)) await makeWritable(join(path, name));
  }
}
try {
  const manifest = join(temporary, 'runtime.json');
  const result = spawnSync(process.env.SAI_RSCRIPT || 'Rscript', [
    '--no-save', '--no-restore', join(root, 'scripts/r-resource-manifest.R'), manifest,
  ], {
    cwd: join(root, 'src-r'),
    env: {
      ...process.env,
      RENV_PROJECT: join(root, 'src-r'),
      RENV_PROFILE: 'default',
      RENV_CONFIG_SANDBOX_ENABLED: 'false',
      RENV_CONFIG_AUTOLOADER_ENABLED: 'true',
    },
    stdio: 'inherit',
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('R の配布用パッケージを確認できませんでした');
  const runtime = JSON.parse(await readFile(manifest, 'utf8'));
  await mkdir(output, { recursive: true });
  // 出力専用ディレクトリ。古いパッケージを配布物へ混ぜない。
  for (const name of await readdir(output)) {
    if (name !== '.gitkeep') await rm(join(output, name), { recursive: true, force: true });
  }
  for (const name of ['cli.R', 'read_sav.R', 'transform.R', 'R', 'renv.lock']) {
    await cp(join(root, 'src-r', name), join(output, name), { recursive: true, dereference: true });
  }
  await cp(join(root, 'scripts/bundled-r-profile.R'), join(output, '.Rprofile'));
  for (const pkg of runtime.packages) {
    await cp(pkg.path, join(output, 'library', pkg.name), { recursive: true, dereference: true });
  }
  // 実行時に必要なのは R の版とCPUのみ。パッケージの元の場所は記録しない。
  await writeFile(join(output, 'runtime.dcf'), `RVersion: ${runtime.rVersion}\nArch: ${runtime.arch}\n`);
  // R 標準添付のパッケージには読取専用ファイルがある。Tauri が次回ビルドで
  // コピー先を上書きできるよう、生成物だけに所有者の書込権限を付ける。
  await makeWritable(output);
  console.log(`R scripts and ${runtime.packages.length} packages prepared in ${output}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
