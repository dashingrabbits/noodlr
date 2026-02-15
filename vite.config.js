import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

const DEFAULT_SAMPLE_SOUNDS_DIR = "/path/to/sounds";
const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".aiff", ".aif", ".flac", ".ogg", ".m4a"]);

const CONTENT_TYPE_BY_EXTENSION = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

const getSampleFolderRoot = (requestedPath) => {
  if (typeof requestedPath === "string" && requestedPath.trim()) {
    return path.resolve(requestedPath.trim());
  }
  const configuredPath = process.env.SAMPLE_SOUNDS_DIR?.trim();
  return path.resolve(configuredPath || DEFAULT_SAMPLE_SOUNDS_DIR);
};

const isPathInsideRoot = (rootPath, targetPath) => {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const collectAudioFiles = async (rootPath) => {
  const queue = [rootPath];
  const results = [];

  while (queue.length > 0) {
    const currentPath = queue.pop();
    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.has(extension)) {
        results.push(fullPath);
      }
    }
  }

  return results;
};

const sampleFolderPlugin = () => {
  return {
    name: "sample-local-sounds",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url;
        if (!requestUrl) {
          next();
          return;
        }

        const parsedUrl = new URL(requestUrl, "http://localhost");
        if (parsedUrl.pathname === "/api/samples/samples") {
          try {
            const soundsRoot = getSampleFolderRoot(parsedUrl.searchParams.get("rootDir"));
            const searchValue = (parsedUrl.searchParams.get("search") || "").trim().toLowerCase();
            const files = await collectAudioFiles(soundsRoot);

            const samples = files
              .map((filePath) => {
                const relativePath = path.relative(soundsRoot, filePath);
                const normalizedRelativePath = relativePath.split(path.sep).join("/");
                const basename = path.basename(filePath);
                return {
                  id: normalizedRelativePath,
                  name: basename,
                  relativePath: normalizedRelativePath,
                  previewUrl: `/api/samples/file?path=${encodeURIComponent(normalizedRelativePath)}&rootDir=${encodeURIComponent(soundsRoot)}`,
                };
              })
              .filter((sample) => {
                if (!searchValue) {
                  return true;
                }
                const searchTarget = `${sample.name} ${sample.relativePath}`.toLowerCase();
                return searchTarget.includes(searchValue);
              })
              .sort((left, right) => left.name.localeCompare(right.name));

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                rootDir: soundsRoot,
                samples,
              })
            );
            return;
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                message: error instanceof Error ? error.message : "Failed to read local sample folder sounds",
              })
            );
            return;
          }
        }

        if (parsedUrl.pathname === "/api/samples/file") {
          const soundsRoot = getSampleFolderRoot(parsedUrl.searchParams.get("rootDir"));
          const relativePath = parsedUrl.searchParams.get("path");
          if (!relativePath) {
            res.statusCode = 400;
            res.end("Missing path parameter");
            return;
          }

          const absolutePath = path.resolve(soundsRoot, relativePath);
          const extension = path.extname(absolutePath).toLowerCase();
          if (!isPathInsideRoot(soundsRoot, absolutePath) || !AUDIO_EXTENSIONS.has(extension)) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }

          try {
            await fsPromises.access(absolutePath, fs.constants.R_OK);
            res.statusCode = 200;
            res.setHeader("Content-Type", CONTENT_TYPE_BY_EXTENSION[extension] || "application/octet-stream");
            fs.createReadStream(absolutePath).pipe(res);
            return;
          } catch {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }
        }

        next();
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), sampleFolderPlugin()],
});
