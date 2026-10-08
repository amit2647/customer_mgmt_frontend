import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy*/waitFor default to 1 s; a file's first render in a busy worker
// pool (CI, or all files at once) can take longer than that.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => cleanup());
