import {
  require_follow_redirects,
  require_form_data,
  require_proxy_from_env
} from "./chunk-I775ELQ2.mjs";
import {
  __commonJS,
  __name,
  __require,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// node_modules/@slack/web-api/dist/errors.js
var require_errors = __commonJS({
  "node_modules/@slack/web-api/dist/errors.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ErrorCode = void 0;
    exports.errorWithCode = errorWithCode;
    exports.requestErrorWithOriginal = requestErrorWithOriginal;
    exports.httpErrorFromResponse = httpErrorFromResponse;
    exports.platformErrorFromResult = platformErrorFromResult;
    exports.rateLimitedErrorWithDelay = rateLimitedErrorWithDelay;
    var ErrorCode;
    (function(ErrorCode2) {
      ErrorCode2["RequestError"] = "slack_webapi_request_error";
      ErrorCode2["HTTPError"] = "slack_webapi_http_error";
      ErrorCode2["PlatformError"] = "slack_webapi_platform_error";
      ErrorCode2["RateLimitedError"] = "slack_webapi_rate_limited_error";
      ErrorCode2["FileUploadInvalidArgumentsError"] = "slack_webapi_file_upload_invalid_args_error";
      ErrorCode2["FileUploadReadFileDataError"] = "slack_webapi_file_upload_read_file_data_error";
    })(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
    function errorWithCode(error, code) {
      const codedError = error;
      codedError.code = code;
      return codedError;
    }
    __name(errorWithCode, "errorWithCode");
    function requestErrorWithOriginal(original, attachOriginal) {
      const error = errorWithCode(new Error(`A request error occurred: ${original.message}`), ErrorCode.RequestError);
      if (attachOriginal) {
        error.original = original;
      }
      return error;
    }
    __name(requestErrorWithOriginal, "requestErrorWithOriginal");
    function httpErrorFromResponse(response) {
      const error = errorWithCode(new Error(`An HTTP protocol error occurred: statusCode = ${response.status}`), ErrorCode.HTTPError);
      error.statusCode = response.status;
      error.statusMessage = response.statusText;
      const nonNullHeaders = {};
      for (const k of Object.keys(response.headers)) {
        if (k && response.headers[k]) {
          nonNullHeaders[k] = response.headers[k];
        }
      }
      error.headers = nonNullHeaders;
      error.body = response.data;
      return error;
    }
    __name(httpErrorFromResponse, "httpErrorFromResponse");
    function platformErrorFromResult(result) {
      const error = errorWithCode(new Error(`An API error occurred: ${result.error}`), ErrorCode.PlatformError);
      error.data = result;
      return error;
    }
    __name(platformErrorFromResult, "platformErrorFromResult");
    function rateLimitedErrorWithDelay(retrySec) {
      const error = errorWithCode(new Error(`A rate-limit has been reached, you may retry this request in ${retrySec} seconds`), ErrorCode.RateLimitedError);
      error.retryAfter = retrySec;
      return error;
    }
    __name(rateLimitedErrorWithDelay, "rateLimitedErrorWithDelay");
  }
});

// node_modules/@slack/web-api/package.json
var require_package = __commonJS({
  "node_modules/@slack/web-api/package.json"(exports, module) {
    module.exports = {
      name: "@slack/web-api",
      version: "7.14.1",
      description: "Official library for using the Slack Platform's Web API",
      author: "Slack Technologies, LLC",
      license: "MIT",
      keywords: [
        "slack",
        "web-api",
        "bot",
        "client",
        "http",
        "api",
        "proxy",
        "rate-limiting",
        "pagination"
      ],
      main: "dist/index.js",
      types: "./dist/index.d.ts",
      files: [
        "dist/**/*"
      ],
      engines: {
        node: ">= 18",
        npm: ">= 8.6.0"
      },
      repository: {
        type: "git",
        url: "git+https://github.com/slackapi/node-slack-sdk.git"
      },
      homepage: "https://docs.slack.dev/tools/node-slack-sdk/web-api/",
      publishConfig: {
        access: "public"
      },
      bugs: {
        url: "https://github.com/slackapi/node-slack-sdk/issues"
      },
      scripts: {
        build: "npm run build:clean && tsc",
        "build:clean": "shx rm -rf ./dist ./coverage",
        docs: "npx typedoc --plugin typedoc-plugin-markdown",
        mocha: 'mocha --config ./test/.mocharc.json "./src/**/*.spec.ts"',
        prepack: "npm run build",
        test: "npm run test:types && npm run test:integration && npm run test:unit",
        "test:integration": "npm run build && node test/integration/commonjs-project/index.js && node test/integration/esm-project/index.mjs && npm run test:integration:ts",
        "test:integration:ts": "cd test/integration/ts-4.7-project && npm i && npm run build",
        "test:types": "tsd",
        "test:unit": "npm run build && c8 --config ./test/.c8rc.json npm run mocha",
        watch: "npx nodemon --watch 'src' --ext 'ts' --exec npm run build"
      },
      dependencies: {
        "@slack/logger": "^4.0.0",
        "@slack/types": "^2.20.0",
        "@types/node": ">=18.0.0",
        "@types/retry": "0.12.0",
        axios: "^1.13.5",
        eventemitter3: "^5.0.1",
        "form-data": "^4.0.4",
        "is-electron": "2.2.2",
        "is-stream": "^2",
        "p-queue": "^6",
        "p-retry": "^4",
        retry: "^0.13.1"
      },
      devDependencies: {
        "@tsconfig/recommended": "^1",
        "@types/busboy": "^1.5.4",
        "@types/chai": "^4",
        "@types/mocha": "^10",
        "@types/sinon": "^21",
        busboy: "^1",
        c8: "^10.1.2",
        chai: "^4",
        mocha: "^11",
        "mocha-junit-reporter": "^2.2.1",
        "mocha-multi-reporters": "^1.5.1",
        nock: "^14",
        shx: "^0.4.0",
        sinon: "^21",
        "source-map-support": "^0.5.21",
        "ts-node": "^10",
        tsd: "^0.33.0",
        typedoc: "^0.28.7",
        "typedoc-plugin-markdown": "^4.7.1",
        typescript: "5.9.3"
      },
      tsd: {
        directory: "test/types"
      }
    };
  }
});

// node_modules/@slack/web-api/dist/instrument.js
var require_instrument = __commonJS({
  "node_modules/@slack/web-api/dist/instrument.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ function() {
      var ownKeys = /* @__PURE__ */ __name(function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      }, "ownKeys");
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.addAppMetadata = addAppMetadata;
    exports.getUserAgent = getUserAgent;
    var os = __importStar(__require("node:os"));
    var node_path_1 = __require("node:path");
    var packageJson = require_package();
    function replaceSlashes(s) {
      return s.replace("/", ":");
    }
    __name(replaceSlashes, "replaceSlashes");
    var baseUserAgent = `${replaceSlashes(packageJson.name)}/${packageJson.version} ${(0, node_path_1.basename)(process.title)}/${process.version.replace("v", "")} ${os.platform()}/${os.release()}`;
    var appMetadata = {};
    function addAppMetadata({ name, version }) {
      appMetadata[replaceSlashes(name)] = version;
    }
    __name(addAppMetadata, "addAppMetadata");
    function getUserAgent() {
      const appIdentifier = Object.entries(appMetadata).map(([name, version]) => `${name}/${version}`).join(" ");
      return (appIdentifier.length > 0 ? `${appIdentifier} ` : "") + baseUserAgent;
    }
    __name(getUserAgent, "getUserAgent");
  }
});

// node_modules/@slack/logger/dist/index.js
var require_dist = __commonJS({
  "node_modules/@slack/logger/dist/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConsoleLogger = exports.LogLevel = void 0;
    var LogLevel;
    (function(LogLevel2) {
      LogLevel2["ERROR"] = "error";
      LogLevel2["WARN"] = "warn";
      LogLevel2["INFO"] = "info";
      LogLevel2["DEBUG"] = "debug";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
    var ConsoleLogger = class _ConsoleLogger {
      static {
        __name(this, "ConsoleLogger");
      }
      constructor() {
        this.level = LogLevel.INFO;
        this.name = "";
      }
      getLevel() {
        return this.level;
      }
      /**
       * Sets the instance's log level so that only messages which are equal or more severe are output to the console.
       */
      setLevel(level) {
        this.level = level;
      }
      /**
       * Set the instance's name, which will appear on each log line before the message.
       */
      setName(name) {
        this.name = name;
      }
      /**
       * Log a debug message
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug(...msg) {
        if (_ConsoleLogger.isMoreOrEqualSevere(LogLevel.DEBUG, this.level)) {
          console.debug(_ConsoleLogger.labels.get(LogLevel.DEBUG), this.name, ...msg);
        }
      }
      /**
       * Log an info message
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info(...msg) {
        if (_ConsoleLogger.isMoreOrEqualSevere(LogLevel.INFO, this.level)) {
          console.info(_ConsoleLogger.labels.get(LogLevel.INFO), this.name, ...msg);
        }
      }
      /**
       * Log a warning message
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warn(...msg) {
        if (_ConsoleLogger.isMoreOrEqualSevere(LogLevel.WARN, this.level)) {
          console.warn(_ConsoleLogger.labels.get(LogLevel.WARN), this.name, ...msg);
        }
      }
      /**
       * Log an error message
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error(...msg) {
        if (_ConsoleLogger.isMoreOrEqualSevere(LogLevel.ERROR, this.level)) {
          console.error(_ConsoleLogger.labels.get(LogLevel.ERROR), this.name, ...msg);
        }
      }
      /**
       * Helper to compare two log levels and determine if a is equal or more severe than b
       */
      static isMoreOrEqualSevere(a, b) {
        return _ConsoleLogger.severity[a] >= _ConsoleLogger.severity[b];
      }
    };
    exports.ConsoleLogger = ConsoleLogger;
    ConsoleLogger.labels = (() => {
      const entries = Object.entries(LogLevel);
      const map = entries.map(([key, value]) => [value, `[${key}] `]);
      return new Map(map);
    })();
    ConsoleLogger.severity = {
      [LogLevel.ERROR]: 400,
      [LogLevel.WARN]: 300,
      [LogLevel.INFO]: 200,
      [LogLevel.DEBUG]: 100
    };
  }
});

// node_modules/@slack/web-api/dist/logger.js
var require_logger = __commonJS({
  "node_modules/@slack/web-api/dist/logger.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LogLevel = void 0;
    exports.getLogger = getLogger;
    var logger_1 = require_dist();
    var logger_2 = require_dist();
    Object.defineProperty(exports, "LogLevel", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return logger_2.LogLevel;
    }, "get") });
    var instanceCount = 0;
    function getLogger(name, level, existingLogger) {
      const instanceId = instanceCount;
      instanceCount += 1;
      const logger = (() => {
        if (existingLogger !== void 0) {
          return existingLogger;
        }
        return new logger_1.ConsoleLogger();
      })();
      logger.setName(`web-api:${name}:${instanceId}`);
      if (level !== void 0) {
        logger.setLevel(level);
      }
      return logger;
    }
    __name(getLogger, "getLogger");
  }
});

// node_modules/@slack/web-api/dist/retry-policies.js
var require_retry_policies = __commonJS({
  "node_modules/@slack/web-api/dist/retry-policies.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rapidRetryPolicy = exports.fiveRetriesInFiveMinutes = exports.tenRetriesInAboutThirtyMinutes = void 0;
    exports.tenRetriesInAboutThirtyMinutes = {
      retries: 10,
      factor: 1.96821,
      randomize: true
    };
    exports.fiveRetriesInFiveMinutes = {
      retries: 5,
      factor: 3.86
    };
    exports.rapidRetryPolicy = {
      minTimeout: 0,
      maxTimeout: 1
    };
    var policies = {
      tenRetriesInAboutThirtyMinutes: exports.tenRetriesInAboutThirtyMinutes,
      fiveRetriesInFiveMinutes: exports.fiveRetriesInFiveMinutes,
      rapidRetryPolicy: exports.rapidRetryPolicy
    };
    exports.default = policies;
  }
});

// node_modules/@slack/web-api/dist/types/request/index.js
var require_request = __commonJS({
  "node_modules/@slack/web-api/dist/types/request/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/web-api/dist/types/response/index.js
var require_response = __commonJS({
  "node_modules/@slack/web-api/dist/types/response/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/web-api/dist/chat-stream.js
var require_chat_stream = __commonJS({
  "node_modules/@slack/web-api/dist/chat-stream.js"(exports) {
    "use strict";
    init_esm();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ChatStreamer = void 0;
    var ChatStreamer = class {
      static {
        __name(this, "ChatStreamer");
      }
      /**
       * Instantiate a new chat streamer.
       *
       * @description The "constructor" method creates a unique {@link ChatStreamer} instance that keeps track of one chat stream.
       * @example
       * const client = new WebClient(process.env.SLACK_BOT_TOKEN);
       * const logger = new ConsoleLogger();
       * const args = {
       *   channel: "C0123456789",
       *   thread_ts: "1700000001.123456",
       *   recipient_team_id: "T0123456789",
       *   recipient_user_id: "U0123456789",
       * };
       * const streamer = new ChatStreamer(client, logger, args, { buffer_size: 512 });
       * await streamer.append({
       *   markdown_text: "**hello world!**",
       * });
       * await streamer.stop();
       * @see {@link https://docs.slack.dev/reference/methods/chat.startStream}
       * @see {@link https://docs.slack.dev/reference/methods/chat.appendStream}
       * @see {@link https://docs.slack.dev/reference/methods/chat.stopStream}
       */
      constructor(client, logger, args, options) {
        var _a;
        this.buffer = "";
        this.client = client;
        this.logger = logger;
        this.options = {
          buffer_size: (_a = options.buffer_size) !== null && _a !== void 0 ? _a : 256
        };
        this.state = "starting";
        this.streamArgs = args;
      }
      /**
       * Append to the stream.
       *
       * @description The "append" method appends to the chat stream being used. This method can be called multiple times. After the stream is stopped this method cannot be called.
       * @example
       * const streamer = client.chatStream({
       *   channel: "C0123456789",
       *   thread_ts: "1700000001.123456",
       *   recipient_team_id: "T0123456789",
       *   recipient_user_id: "U0123456789",
       * });
       * await streamer.append({
       *   markdown_text: "**hello wo",
       * });
       * await streamer.append({
       *   markdown_text: "rld!**",
       * });
       * await streamer.stop();
       * @see {@link https://docs.slack.dev/reference/methods/chat.appendStream}
       */
      append(args) {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.state === "completed") {
            throw new Error(`failed to append stream: stream state is ${this.state}`);
          }
          const { markdown_text, chunks } = args, opts = __rest(args, ["markdown_text", "chunks"]);
          if (opts.token) {
            this.token = opts.token;
          }
          if (markdown_text) {
            this.buffer += markdown_text;
          }
          if (this.buffer.length >= this.options.buffer_size || chunks) {
            return yield this.flushBuffer(Object.assign({ chunks }, opts));
          }
          const details = {
            bufferLength: this.buffer.length,
            bufferSize: this.options.buffer_size,
            channel: this.streamArgs.channel,
            recipientTeamId: this.streamArgs.recipient_team_id,
            recipientUserId: this.streamArgs.recipient_user_id,
            threadTs: this.streamArgs.thread_ts
          };
          this.logger.debug(`ChatStreamer appended to buffer: ${JSON.stringify(details)}`);
          return null;
        });
      }
      /**
       * Stop the stream and finalize the message.
       *
       * @description The "stop" method stops the chat stream being used. This method can be called once to end the stream. Additional "blocks" and "metadata" can be provided.
       *
       * @example
       * const streamer = client.chatStream({
       *   channel: "C0123456789",
       *   thread_ts: "1700000001.123456",
       *   recipient_team_id: "T0123456789",
       *   recipient_user_id: "U0123456789",
       * });
       * await streamer.append({
       *   markdown_text: "**hello world!**",
       * });
       * await streamer.stop();
       * @see {@link https://docs.slack.dev/reference/methods/chat.stopStream}
       */
      stop(args) {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.state === "completed") {
            throw new Error(`failed to stop stream: stream state is ${this.state}`);
          }
          const _a = args !== null && args !== void 0 ? args : {}, { markdown_text, chunks } = _a, opts = __rest(_a, ["markdown_text", "chunks"]);
          if (opts.token) {
            this.token = opts.token;
          }
          if (markdown_text) {
            this.buffer += markdown_text;
          }
          if (!this.streamTs) {
            const response2 = yield this.client.chat.startStream(Object.assign(Object.assign({}, this.streamArgs), { token: this.token }));
            if (!response2.ts) {
              throw new Error("failed to stop stream: stream not started");
            }
            this.streamTs = response2.ts;
            this.state = "in_progress";
          }
          const chunksToFlush = [];
          if (this.buffer.length > 0) {
            chunksToFlush.push({
              type: "markdown_text",
              text: this.buffer
            });
          }
          if (chunks) {
            chunksToFlush.push(...chunks);
          }
          const response = yield this.client.chat.stopStream(Object.assign({ token: this.token, channel: this.streamArgs.channel, ts: this.streamTs, chunks: chunksToFlush }, opts));
          this.state = "completed";
          return response;
        });
      }
      flushBuffer(args) {
        return __awaiter(this, void 0, void 0, function* () {
          const _a = args !== null && args !== void 0 ? args : {}, { chunks } = _a, opts = __rest(_a, ["chunks"]);
          const chunksToFlush = [];
          if (this.buffer.length > 0) {
            chunksToFlush.push({
              type: "markdown_text",
              text: this.buffer
            });
          }
          if (chunks) {
            chunksToFlush.push(...chunks);
          }
          if (!this.streamTs) {
            const response2 = yield this.client.chat.startStream(Object.assign(Object.assign(Object.assign({}, this.streamArgs), { token: this.token, chunks: chunksToFlush }), opts));
            this.buffer = "";
            this.streamTs = response2.ts;
            this.state = "in_progress";
            return response2;
          }
          const response = yield this.client.chat.appendStream(Object.assign({ token: this.token, channel: this.streamArgs.channel, ts: this.streamTs, chunks: chunksToFlush }, opts));
          this.buffer = "";
          return response;
        });
      }
    };
    exports.ChatStreamer = ChatStreamer;
  }
});

// node_modules/axios/dist/node/axios.cjs
var require_axios = __commonJS({
  "node_modules/axios/dist/node/axios.cjs"(exports, module) {
    "use strict";
    init_esm();
    var FormData$1 = require_form_data();
    var crypto = __require("crypto");
    var url = __require("url");
    var proxyFromEnv = require_proxy_from_env();
    var http = __require("http");
    var https = __require("https");
    var http2 = __require("http2");
    var util = __require("util");
    var followRedirects = require_follow_redirects();
    var zlib = __require("zlib");
    var stream = __require("stream");
    var events = __require("events");
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    __name(_interopDefaultLegacy, "_interopDefaultLegacy");
    var FormData__default = /* @__PURE__ */ _interopDefaultLegacy(FormData$1);
    var crypto__default = /* @__PURE__ */ _interopDefaultLegacy(crypto);
    var url__default = /* @__PURE__ */ _interopDefaultLegacy(url);
    var proxyFromEnv__default = /* @__PURE__ */ _interopDefaultLegacy(proxyFromEnv);
    var http__default = /* @__PURE__ */ _interopDefaultLegacy(http);
    var https__default = /* @__PURE__ */ _interopDefaultLegacy(https);
    var http2__default = /* @__PURE__ */ _interopDefaultLegacy(http2);
    var util__default = /* @__PURE__ */ _interopDefaultLegacy(util);
    var followRedirects__default = /* @__PURE__ */ _interopDefaultLegacy(followRedirects);
    var zlib__default = /* @__PURE__ */ _interopDefaultLegacy(zlib);
    var stream__default = /* @__PURE__ */ _interopDefaultLegacy(stream);
    function bind(fn, thisArg) {
      return /* @__PURE__ */ __name(function wrap() {
        return fn.apply(thisArg, arguments);
      }, "wrap");
    }
    __name(bind, "bind");
    var { toString } = Object.prototype;
    var { getPrototypeOf } = Object;
    var { iterator, toStringTag } = Symbol;
    var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
      const str = toString.call(thing);
      return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(/* @__PURE__ */ Object.create(null));
    var kindOfTest = /* @__PURE__ */ __name((type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type;
    }, "kindOfTest");
    var typeOfTest = /* @__PURE__ */ __name((type) => (thing) => typeof thing === type, "typeOfTest");
    var { isArray } = Array;
    var isUndefined = typeOfTest("undefined");
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
    }
    __name(isBuffer, "isBuffer");
    var isArrayBuffer = kindOfTest("ArrayBuffer");
    function isArrayBufferView(val) {
      let result;
      if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
        result = ArrayBuffer.isView(val);
      } else {
        result = val && val.buffer && isArrayBuffer(val.buffer);
      }
      return result;
    }
    __name(isArrayBufferView, "isArrayBufferView");
    var isString = typeOfTest("string");
    var isFunction$1 = typeOfTest("function");
    var isNumber = typeOfTest("number");
    var isObject = /* @__PURE__ */ __name((thing) => thing !== null && typeof thing === "object", "isObject");
    var isBoolean = /* @__PURE__ */ __name((thing) => thing === true || thing === false, "isBoolean");
    var isPlainObject = /* @__PURE__ */ __name((val) => {
      if (kindOf(val) !== "object") {
        return false;
      }
      const prototype2 = getPrototypeOf(val);
      return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
    }, "isPlainObject");
    var isEmptyObject = /* @__PURE__ */ __name((val) => {
      if (!isObject(val) || isBuffer(val)) {
        return false;
      }
      try {
        return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
      } catch (e) {
        return false;
      }
    }, "isEmptyObject");
    var isDate = kindOfTest("Date");
    var isFile = kindOfTest("File");
    var isBlob = kindOfTest("Blob");
    var isFileList = kindOfTest("FileList");
    var isStream = /* @__PURE__ */ __name((val) => isObject(val) && isFunction$1(val.pipe), "isStream");
    var isFormData = /* @__PURE__ */ __name((thing) => {
      let kind;
      return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction$1(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
      kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]"));
    }, "isFormData");
    var isURLSearchParams = kindOfTest("URLSearchParams");
    var [isReadableStream, isRequest, isResponse, isHeaders] = [
      "ReadableStream",
      "Request",
      "Response",
      "Headers"
    ].map(kindOfTest);
    var trim = /* @__PURE__ */ __name((str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""), "trim");
    function forEach(obj, fn, { allOwnKeys = false } = {}) {
      if (obj === null || typeof obj === "undefined") {
        return;
      }
      let i;
      let l;
      if (typeof obj !== "object") {
        obj = [obj];
      }
      if (isArray(obj)) {
        for (i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        if (isBuffer(obj)) {
          return;
        }
        const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
        const len = keys.length;
        let key;
        for (i = 0; i < len; i++) {
          key = keys[i];
          fn.call(null, obj[key], key, obj);
        }
      }
    }
    __name(forEach, "forEach");
    function findKey(obj, key) {
      if (isBuffer(obj)) {
        return null;
      }
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while (i-- > 0) {
        _key = keys[i];
        if (key === _key.toLowerCase()) {
          return _key;
        }
      }
      return null;
    }
    __name(findKey, "findKey");
    var _global = (() => {
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
    })();
    var isContextDefined = /* @__PURE__ */ __name((context) => !isUndefined(context) && context !== _global, "isContextDefined");
    function merge() {
      const { caseless, skipUndefined } = isContextDefined(this) && this || {};
      const result = {};
      const assignValue = /* @__PURE__ */ __name((val, key) => {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return;
        }
        const targetKey = caseless && findKey(result, key) || key;
        if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
          result[targetKey] = merge(result[targetKey], val);
        } else if (isPlainObject(val)) {
          result[targetKey] = merge({}, val);
        } else if (isArray(val)) {
          result[targetKey] = val.slice();
        } else if (!skipUndefined || !isUndefined(val)) {
          result[targetKey] = val;
        }
      }, "assignValue");
      for (let i = 0, l = arguments.length; i < l; i++) {
        arguments[i] && forEach(arguments[i], assignValue);
      }
      return result;
    }
    __name(merge, "merge");
    var extend = /* @__PURE__ */ __name((a, b, thisArg, { allOwnKeys } = {}) => {
      forEach(
        b,
        (val, key) => {
          if (thisArg && isFunction$1(val)) {
            Object.defineProperty(a, key, {
              value: bind(val, thisArg),
              writable: true,
              enumerable: true,
              configurable: true
            });
          } else {
            Object.defineProperty(a, key, {
              value: val,
              writable: true,
              enumerable: true,
              configurable: true
            });
          }
        },
        { allOwnKeys }
      );
      return a;
    }, "extend");
    var stripBOM = /* @__PURE__ */ __name((content) => {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    }, "stripBOM");
    var inherits = /* @__PURE__ */ __name((constructor, superConstructor, props, descriptors) => {
      constructor.prototype = Object.create(
        superConstructor.prototype,
        descriptors
      );
      Object.defineProperty(constructor.prototype, "constructor", {
        value: constructor,
        writable: true,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(constructor, "super", {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    }, "inherits");
    var toFlatObject = /* @__PURE__ */ __name((sourceObj, destObj, filter, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      if (sourceObj == null) return destObj;
      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
      return destObj;
    }, "toFlatObject");
    var endsWith = /* @__PURE__ */ __name((str, searchString, position) => {
      str = String(str);
      if (position === void 0 || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    }, "endsWith");
    var toArray = /* @__PURE__ */ __name((thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    }, "toArray");
    var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
      return (thing) => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
    var forEachEntry = /* @__PURE__ */ __name((obj, fn) => {
      const generator = obj && obj[iterator];
      const _iterator = generator.call(obj);
      let result;
      while ((result = _iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    }, "forEachEntry");
    var matchAll = /* @__PURE__ */ __name((regExp, str) => {
      let matches;
      const arr = [];
      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }
      return arr;
    }, "matchAll");
    var isHTMLForm = kindOfTest("HTMLFormElement");
    var toCamelCase = /* @__PURE__ */ __name((str) => {
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, /* @__PURE__ */ __name(function replacer(m, p1, p2) {
        return p1.toUpperCase() + p2;
      }, "replacer"));
    }, "toCamelCase");
    var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
    var isRegExp = kindOfTest("RegExp");
    var reduceDescriptors = /* @__PURE__ */ __name((obj, reducer) => {
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach(descriptors, (descriptor, name) => {
        let ret;
        if ((ret = reducer(descriptor, name, obj)) !== false) {
          reducedDescriptors[name] = ret || descriptor;
        }
      });
      Object.defineProperties(obj, reducedDescriptors);
    }, "reduceDescriptors");
    var freezeMethods = /* @__PURE__ */ __name((obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        if (isFunction$1(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
          return false;
        }
        const value = obj[name];
        if (!isFunction$1(value)) return;
        descriptor.enumerable = false;
        if ("writable" in descriptor) {
          descriptor.writable = false;
          return;
        }
        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error("Can not rewrite read-only method '" + name + "'");
          };
        }
      });
    }, "freezeMethods");
    var toObjectSet = /* @__PURE__ */ __name((arrayOrString, delimiter) => {
      const obj = {};
      const define = /* @__PURE__ */ __name((arr) => {
        arr.forEach((value) => {
          obj[value] = true;
        });
      }, "define");
      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
    }, "toObjectSet");
    var noop = /* @__PURE__ */ __name(() => {
    }, "noop");
    var toFiniteNumber = /* @__PURE__ */ __name((value, defaultValue) => {
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
    }, "toFiniteNumber");
    function isSpecCompliantForm(thing) {
      return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
    }
    __name(isSpecCompliantForm, "isSpecCompliantForm");
    var toJSONObject = /* @__PURE__ */ __name((obj) => {
      const stack = new Array(10);
      const visit = /* @__PURE__ */ __name((source, i) => {
        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }
          if (isBuffer(source)) {
            return source;
          }
          if (!("toJSON" in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};
            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });
            stack[i] = void 0;
            return target;
          }
        }
        return source;
      }, "visit");
      return visit(obj, 0);
    }, "toJSONObject");
    var isAsyncFn = kindOfTest("AsyncFunction");
    var isThenable = /* @__PURE__ */ __name((thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch), "isThenable");
    var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
      if (setImmediateSupported) {
        return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks) => {
        _global.addEventListener(
          "message",
          ({ source, data }) => {
            if (source === _global && data === token) {
              callbacks.length && callbacks.shift()();
            }
          },
          false
        );
        return (cb) => {
          callbacks.push(cb);
          _global.postMessage(token, "*");
        };
      })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
    })(typeof setImmediate === "function", isFunction$1(_global.postMessage));
    var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
    var isIterable = /* @__PURE__ */ __name((thing) => thing != null && isFunction$1(thing[iterator]), "isIterable");
    var utils$1 = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isEmptyObject,
      isReadableStream,
      isRequest,
      isResponse,
      isHeaders,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction: isFunction$1,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty,
      // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable,
      setImmediate: _setImmediate,
      asap,
      isIterable
    };
    var AxiosError = class _AxiosError extends Error {
      static {
        __name(this, "AxiosError");
      }
      static from(error, code, config, request, response, customProps) {
        const axiosError = new _AxiosError(error.message, code || error.code, config, request, response);
        axiosError.cause = error;
        axiosError.name = error.name;
        customProps && Object.assign(axiosError, customProps);
        return axiosError;
      }
      /**
       * Create an Error with the specified message, config, error code, request and response.
       *
       * @param {string} message The error message.
       * @param {string} [code] The error code (for example, 'ECONNABORTED').
       * @param {Object} [config] The config.
       * @param {Object} [request] The request.
       * @param {Object} [response] The response.
       *
       * @returns {Error} The created error.
       */
      constructor(message, code, config, request, response) {
        super(message);
        this.name = "AxiosError";
        this.isAxiosError = true;
        code && (this.code = code);
        config && (this.config = config);
        request && (this.request = request);
        if (response) {
          this.response = response;
          this.status = response.status;
        }
      }
      toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils$1.toJSONObject(this.config),
          code: this.code,
          status: this.status
        };
      }
    };
    AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
    AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
    AxiosError.ECONNABORTED = "ECONNABORTED";
    AxiosError.ETIMEDOUT = "ETIMEDOUT";
    AxiosError.ERR_NETWORK = "ERR_NETWORK";
    AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
    AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
    AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
    AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
    AxiosError.ERR_CANCELED = "ERR_CANCELED";
    AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
    AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
    var AxiosError$1 = AxiosError;
    function isVisitable(thing) {
      return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
    }
    __name(isVisitable, "isVisitable");
    function removeBrackets(key) {
      return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
    }
    __name(removeBrackets, "removeBrackets");
    function renderKey(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(/* @__PURE__ */ __name(function each(token, i) {
        token = removeBrackets(token);
        return !dots && i ? "[" + token + "]" : token;
      }, "each")).join(dots ? "." : "");
    }
    __name(renderKey, "renderKey");
    function isFlatArray(arr) {
      return utils$1.isArray(arr) && !arr.some(isVisitable);
    }
    __name(isFlatArray, "isFlatArray");
    var predicates = utils$1.toFlatObject(utils$1, {}, null, /* @__PURE__ */ __name(function filter(prop) {
      return /^is[A-Z]/.test(prop);
    }, "filter"));
    function toFormData(obj, formData, options) {
      if (!utils$1.isObject(obj)) {
        throw new TypeError("target must be an object");
      }
      formData = formData || new (FormData__default["default"] || FormData)();
      options = utils$1.toFlatObject(options, {
        metaTokens: true,
        dots: false,
        indexes: false
      }, false, /* @__PURE__ */ __name(function defined(option, source) {
        return !utils$1.isUndefined(source[option]);
      }, "defined"));
      const metaTokens = options.metaTokens;
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
      const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
      if (!utils$1.isFunction(visitor)) {
        throw new TypeError("visitor must be a function");
      }
      function convertValue(value) {
        if (value === null) return "";
        if (utils$1.isDate(value)) {
          return value.toISOString();
        }
        if (utils$1.isBoolean(value)) {
          return value.toString();
        }
        if (!useBlob && utils$1.isBlob(value)) {
          throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
        }
        if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
          return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
        }
        return value;
      }
      __name(convertValue, "convertValue");
      function defaultVisitor(value, key, path) {
        let arr = value;
        if (value && !path && typeof value === "object") {
          if (utils$1.endsWith(key, "{}")) {
            key = metaTokens ? key : key.slice(0, -2);
            value = JSON.stringify(value);
          } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
            key = removeBrackets(key);
            arr.forEach(/* @__PURE__ */ __name(function each(el, index) {
              !(utils$1.isUndefined(el) || el === null) && formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
                convertValue(el)
              );
            }, "each"));
            return false;
          }
        }
        if (isVisitable(value)) {
          return true;
        }
        formData.append(renderKey(path, key, dots), convertValue(value));
        return false;
      }
      __name(defaultVisitor, "defaultVisitor");
      const stack = [];
      const exposedHelpers = Object.assign(predicates, {
        defaultVisitor,
        convertValue,
        isVisitable
      });
      function build(value, path) {
        if (utils$1.isUndefined(value)) return;
        if (stack.indexOf(value) !== -1) {
          throw Error("Circular reference detected in " + path.join("."));
        }
        stack.push(value);
        utils$1.forEach(value, /* @__PURE__ */ __name(function each(el, key) {
          const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
            formData,
            el,
            utils$1.isString(key) ? key.trim() : key,
            path,
            exposedHelpers
          );
          if (result === true) {
            build(el, path ? path.concat(key) : [key]);
          }
        }, "each"));
        stack.pop();
      }
      __name(build, "build");
      if (!utils$1.isObject(obj)) {
        throw new TypeError("data must be an object");
      }
      build(obj);
      return formData;
    }
    __name(toFormData, "toFormData");
    function encode$1(str) {
      const charMap = {
        "!": "%21",
        "'": "%27",
        "(": "%28",
        ")": "%29",
        "~": "%7E",
        "%20": "+",
        "%00": "\0"
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, /* @__PURE__ */ __name(function replacer(match) {
        return charMap[match];
      }, "replacer"));
    }
    __name(encode$1, "encode$1");
    function AxiosURLSearchParams(params, options) {
      this._pairs = [];
      params && toFormData(params, this, options);
    }
    __name(AxiosURLSearchParams, "AxiosURLSearchParams");
    var prototype = AxiosURLSearchParams.prototype;
    prototype.append = /* @__PURE__ */ __name(function append(name, value) {
      this._pairs.push([name, value]);
    }, "append");
    prototype.toString = /* @__PURE__ */ __name(function toString2(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode$1);
      } : encode$1;
      return this._pairs.map(/* @__PURE__ */ __name(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "each"), "").join("&");
    }, "toString");
    function encode(val) {
      return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
    }
    __name(encode, "encode");
    function buildURL(url2, params, options) {
      if (!params) {
        return url2;
      }
      const _encode = options && options.encode || encode;
      const _options = utils$1.isFunction(options) ? {
        serialize: options
      } : options;
      const serializeFn = _options && _options.serialize;
      let serializedParams;
      if (serializeFn) {
        serializedParams = serializeFn(params, _options);
      } else {
        serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
      }
      if (serializedParams) {
        const hashmarkIndex = url2.indexOf("#");
        if (hashmarkIndex !== -1) {
          url2 = url2.slice(0, hashmarkIndex);
        }
        url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
      }
      return url2;
    }
    __name(buildURL, "buildURL");
    var InterceptorManager = class {
      static {
        __name(this, "InterceptorManager");
      }
      constructor() {
        this.handlers = [];
      }
      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       * @param {Object} options The options for the interceptor, synchronous and runWhen
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }
      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {void}
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }
      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }
      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils$1.forEach(this.handlers, /* @__PURE__ */ __name(function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        }, "forEachHandler"));
      }
    };
    var InterceptorManager$1 = InterceptorManager;
    var transitionalDefaults = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false,
      legacyInterceptorReqResOrdering: true
    };
    var URLSearchParams = url__default["default"].URLSearchParams;
    var ALPHA = "abcdefghijklmnopqrstuvwxyz";
    var DIGIT = "0123456789";
    var ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };
    var generateString = /* @__PURE__ */ __name((size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
      let str = "";
      const { length } = alphabet;
      const randomValues = new Uint32Array(size);
      crypto__default["default"].randomFillSync(randomValues);
      for (let i = 0; i < size; i++) {
        str += alphabet[randomValues[i] % length];
      }
      return str;
    }, "generateString");
    var platform$1 = {
      isNode: true,
      classes: {
        URLSearchParams,
        FormData: FormData__default["default"],
        Blob: typeof Blob !== "undefined" && Blob || null
      },
      ALPHABET,
      generateString,
      protocols: ["http", "https", "file", "data"]
    };
    var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
    var _navigator = typeof navigator === "object" && navigator || void 0;
    var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
    var hasStandardBrowserWebWorkerEnv = (() => {
      return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
    })();
    var origin = hasBrowserEnv && window.location.href || "http://localhost";
    var utils = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      hasBrowserEnv,
      hasStandardBrowserWebWorkerEnv,
      hasStandardBrowserEnv,
      navigator: _navigator,
      origin
    });
    var platform = {
      ...utils,
      ...platform$1
    };
    function toURLEncodedForm(data, options) {
      return toFormData(data, new platform.classes.URLSearchParams(), {
        visitor: /* @__PURE__ */ __name(function(value, key, path, helpers) {
          if (platform.isNode && utils$1.isBuffer(value)) {
            this.append(key, value.toString("base64"));
            return false;
          }
          return helpers.defaultVisitor.apply(this, arguments);
        }, "visitor"),
        ...options
      });
    }
    __name(toURLEncodedForm, "toURLEncodedForm");
    function parsePropPath(name) {
      return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
        return match[0] === "[]" ? "" : match[1] || match[0];
      });
    }
    __name(parsePropPath, "parsePropPath");
    function arrayToObject(arr) {
      const obj = {};
      const keys = Object.keys(arr);
      let i;
      const len = keys.length;
      let key;
      for (i = 0; i < len; i++) {
        key = keys[i];
        obj[key] = arr[key];
      }
      return obj;
    }
    __name(arrayToObject, "arrayToObject");
    function formDataToJSON(formData) {
      function buildPath(path, value, target, index) {
        let name = path[index++];
        if (name === "__proto__") return true;
        const isNumericKey = Number.isFinite(+name);
        const isLast = index >= path.length;
        name = !name && utils$1.isArray(target) ? target.length : name;
        if (isLast) {
          if (utils$1.hasOwnProp(target, name)) {
            target[name] = [target[name], value];
          } else {
            target[name] = value;
          }
          return !isNumericKey;
        }
        if (!target[name] || !utils$1.isObject(target[name])) {
          target[name] = [];
        }
        const result = buildPath(path, value, target[name], index);
        if (result && utils$1.isArray(target[name])) {
          target[name] = arrayToObject(target[name]);
        }
        return !isNumericKey;
      }
      __name(buildPath, "buildPath");
      if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
        const obj = {};
        utils$1.forEachEntry(formData, (name, value) => {
          buildPath(parsePropPath(name), value, obj, 0);
        });
        return obj;
      }
      return null;
    }
    __name(formDataToJSON, "formDataToJSON");
    function stringifySafely(rawValue, parser, encoder) {
      if (utils$1.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils$1.trim(rawValue);
        } catch (e) {
          if (e.name !== "SyntaxError") {
            throw e;
          }
        }
      }
      return (encoder || JSON.stringify)(rawValue);
    }
    __name(stringifySafely, "stringifySafely");
    var defaults = {
      transitional: transitionalDefaults,
      adapter: ["xhr", "http", "fetch"],
      transformRequest: [/* @__PURE__ */ __name(function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils$1.isObject(data);
        if (isObjectPayload && utils$1.isHTMLForm(data)) {
          data = new FormData(data);
        }
        const isFormData2 = utils$1.isFormData(data);
        if (isFormData2) {
          return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
        }
        if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
          return data;
        }
        if (utils$1.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$1.isURLSearchParams(data)) {
          headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
          return data.toString();
        }
        let isFileList2;
        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }
          if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
            const _FormData = this.env && this.env.FormData;
            return toFormData(
              isFileList2 ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }
        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }
        return data;
      }, "transformRequest")],
      transformResponse: [/* @__PURE__ */ __name(function transformResponse(data) {
        const transitional = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";
        if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
          return data;
        }
        if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
          const silentJSONParsing = transitional && transitional.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;
          try {
            return JSON.parse(data, this.parseReviver);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === "SyntaxError") {
                throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }
        return data;
      }, "transformResponse")],
      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
        FormData: platform.classes.FormData,
        Blob: platform.classes.Blob
      },
      validateStatus: /* @__PURE__ */ __name(function validateStatus(status) {
        return status >= 200 && status < 300;
      }, "validateStatus"),
      headers: {
        common: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": void 0
        }
      }
    };
    utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
      defaults.headers[method] = {};
    });
    var defaults$1 = defaults;
    var ignoreDuplicateOf = utils$1.toObjectSet([
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent"
    ]);
    var parseHeaders = /* @__PURE__ */ __name((rawHeaders) => {
      const parsed = {};
      let key;
      let val;
      let i;
      rawHeaders && rawHeaders.split("\n").forEach(/* @__PURE__ */ __name(function parser(line) {
        i = line.indexOf(":");
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();
        if (!key || parsed[key] && ignoreDuplicateOf[key]) {
          return;
        }
        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      }, "parser"));
      return parsed;
    }, "parseHeaders");
    var $internals = Symbol("internals");
    function normalizeHeader(header) {
      return header && String(header).trim().toLowerCase();
    }
    __name(normalizeHeader, "normalizeHeader");
    function normalizeValue(value) {
      if (value === false || value == null) {
        return value;
      }
      return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
    }
    __name(normalizeValue, "normalizeValue");
    function parseTokens(str) {
      const tokens = /* @__PURE__ */ Object.create(null);
      const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
      let match;
      while (match = tokensRE.exec(str)) {
        tokens[match[1]] = match[2];
      }
      return tokens;
    }
    __name(parseTokens, "parseTokens");
    var isValidHeaderName = /* @__PURE__ */ __name((str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim()), "isValidHeaderName");
    function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
      if (utils$1.isFunction(filter)) {
        return filter.call(this, value, header);
      }
      if (isHeaderNameFilter) {
        value = header;
      }
      if (!utils$1.isString(value)) return;
      if (utils$1.isString(filter)) {
        return value.indexOf(filter) !== -1;
      }
      if (utils$1.isRegExp(filter)) {
        return filter.test(value);
      }
    }
    __name(matchHeaderValue, "matchHeaderValue");
    function formatHeader(header) {
      return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
        return char.toUpperCase() + str;
      });
    }
    __name(formatHeader, "formatHeader");
    function buildAccessors(obj, header) {
      const accessorName = utils$1.toCamelCase(" " + header);
      ["get", "set", "has"].forEach((methodName) => {
        Object.defineProperty(obj, methodName + accessorName, {
          value: /* @__PURE__ */ __name(function(arg1, arg2, arg3) {
            return this[methodName].call(this, header, arg1, arg2, arg3);
          }, "value"),
          configurable: true
        });
      });
    }
    __name(buildAccessors, "buildAccessors");
    var AxiosHeaders = class {
      static {
        __name(this, "AxiosHeaders");
      }
      constructor(headers) {
        headers && this.set(headers);
      }
      set(header, valueOrRewrite, rewrite) {
        const self2 = this;
        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);
          if (!lHeader) {
            throw new Error("header name must be a non-empty string");
          }
          const key = utils$1.findKey(self2, lHeader);
          if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
            self2[key || _header] = normalizeValue(_value);
          }
        }
        __name(setHeader, "setHeader");
        const setHeaders = /* @__PURE__ */ __name((headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite)), "setHeaders");
        if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders(header), valueOrRewrite);
        } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
          let obj = {}, dest, key;
          for (const entry of header) {
            if (!utils$1.isArray(entry)) {
              throw TypeError("Object iterator must return a key-value pair");
            }
            obj[key = entry[0]] = (dest = obj[key]) ? utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
          }
          setHeaders(obj, valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }
        return this;
      }
      get(header, parser) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils$1.findKey(this, header);
          if (key) {
            const value = this[key];
            if (!parser) {
              return value;
            }
            if (parser === true) {
              return parseTokens(value);
            }
            if (utils$1.isFunction(parser)) {
              return parser.call(this, value, key);
            }
            if (utils$1.isRegExp(parser)) {
              return parser.exec(value);
            }
            throw new TypeError("parser must be boolean|regexp|function");
          }
        }
      }
      has(header, matcher) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils$1.findKey(this, header);
          return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }
        return false;
      }
      delete(header, matcher) {
        const self2 = this;
        let deleted = false;
        function deleteHeader(_header) {
          _header = normalizeHeader(_header);
          if (_header) {
            const key = utils$1.findKey(self2, _header);
            if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
              delete self2[key];
              deleted = true;
            }
          }
        }
        __name(deleteHeader, "deleteHeader");
        if (utils$1.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }
        return deleted;
      }
      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;
        while (i--) {
          const key = keys[i];
          if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }
        return deleted;
      }
      normalize(format) {
        const self2 = this;
        const headers = {};
        utils$1.forEach(this, (value, header) => {
          const key = utils$1.findKey(headers, header);
          if (key) {
            self2[key] = normalizeValue(value);
            delete self2[header];
            return;
          }
          const normalized = format ? formatHeader(header) : String(header).trim();
          if (normalized !== header) {
            delete self2[header];
          }
          self2[normalized] = normalizeValue(value);
          headers[normalized] = true;
        });
        return this;
      }
      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }
      toJSON(asStrings) {
        const obj = /* @__PURE__ */ Object.create(null);
        utils$1.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
        });
        return obj;
      }
      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }
      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
      }
      getSetCookie() {
        return this.get("set-cookie") || [];
      }
      get [Symbol.toStringTag]() {
        return "AxiosHeaders";
      }
      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }
      static concat(first, ...targets) {
        const computed = new this(first);
        targets.forEach((target) => computed.set(target));
        return computed;
      }
      static accessor(header) {
        const internals = this[$internals] = this[$internals] = {
          accessors: {}
        };
        const accessors = internals.accessors;
        const prototype2 = this.prototype;
        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);
          if (!accessors[lHeader]) {
            buildAccessors(prototype2, _header);
            accessors[lHeader] = true;
          }
        }
        __name(defineAccessor, "defineAccessor");
        utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
        return this;
      }
    };
    AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
    utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
      let mapped = key[0].toUpperCase() + key.slice(1);
      return {
        get: /* @__PURE__ */ __name(() => value, "get"),
        set(headerValue) {
          this[mapped] = headerValue;
        }
      };
    });
    utils$1.freezeMethods(AxiosHeaders);
    var AxiosHeaders$1 = AxiosHeaders;
    function transformData(fns, response) {
      const config = this || defaults$1;
      const context = response || config;
      const headers = AxiosHeaders$1.from(context.headers);
      let data = context.data;
      utils$1.forEach(fns, /* @__PURE__ */ __name(function transform(fn) {
        data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
      }, "transform"));
      headers.normalize();
      return data;
    }
    __name(transformData, "transformData");
    function isCancel(value) {
      return !!(value && value.__CANCEL__);
    }
    __name(isCancel, "isCancel");
    var CanceledError = class extends AxiosError$1 {
      static {
        __name(this, "CanceledError");
      }
      /**
       * A `CanceledError` is an object that is thrown when an operation is canceled.
       *
       * @param {string=} message The message.
       * @param {Object=} config The config.
       * @param {Object=} request The request.
       *
       * @returns {CanceledError} The created error.
       */
      constructor(message, config, request) {
        super(message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request);
        this.name = "CanceledError";
        this.__CANCEL__ = true;
      }
    };
    var CanceledError$1 = CanceledError;
    function settle(resolve, reject, response) {
      const validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(new AxiosError$1(
          "Request failed with status code " + response.status,
          [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        ));
      }
    }
    __name(settle, "settle");
    function isAbsoluteURL(url2) {
      if (typeof url2 !== "string") {
        return false;
      }
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
    }
    __name(isAbsoluteURL, "isAbsoluteURL");
    function combineURLs(baseURL, relativeURL) {
      return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
    }
    __name(combineURLs, "combineURLs");
    function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
      let isRelativeUrl = !isAbsoluteURL(requestedURL);
      if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    }
    __name(buildFullPath, "buildFullPath");
    var VERSION = "1.13.5";
    function parseProtocol(url2) {
      const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
      return match && match[1] || "";
    }
    __name(parseProtocol, "parseProtocol");
    var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
    function fromDataURI(uri, asBlob, options) {
      const _Blob = options && options.Blob || platform.classes.Blob;
      const protocol = parseProtocol(uri);
      if (asBlob === void 0 && _Blob) {
        asBlob = true;
      }
      if (protocol === "data") {
        uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
        const match = DATA_URL_PATTERN.exec(uri);
        if (!match) {
          throw new AxiosError$1("Invalid URL", AxiosError$1.ERR_INVALID_URL);
        }
        const mime = match[1];
        const isBase64 = match[2];
        const body = match[3];
        const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
        if (asBlob) {
          if (!_Blob) {
            throw new AxiosError$1("Blob is not supported", AxiosError$1.ERR_NOT_SUPPORT);
          }
          return new _Blob([buffer], { type: mime });
        }
        return buffer;
      }
      throw new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_NOT_SUPPORT);
    }
    __name(fromDataURI, "fromDataURI");
    var kInternals = Symbol("internals");
    var AxiosTransformStream = class extends stream__default["default"].Transform {
      static {
        __name(this, "AxiosTransformStream");
      }
      constructor(options) {
        options = utils$1.toFlatObject(options, {
          maxRate: 0,
          chunkSize: 64 * 1024,
          minChunkSize: 100,
          timeWindow: 500,
          ticksRate: 2,
          samplesCount: 15
        }, null, (prop, source) => {
          return !utils$1.isUndefined(source[prop]);
        });
        super({
          readableHighWaterMark: options.chunkSize
        });
        const internals = this[kInternals] = {
          timeWindow: options.timeWindow,
          chunkSize: options.chunkSize,
          maxRate: options.maxRate,
          minChunkSize: options.minChunkSize,
          bytesSeen: 0,
          isCaptured: false,
          notifiedBytesLoaded: 0,
          ts: Date.now(),
          bytes: 0,
          onReadCallback: null
        };
        this.on("newListener", (event) => {
          if (event === "progress") {
            if (!internals.isCaptured) {
              internals.isCaptured = true;
            }
          }
        });
      }
      _read(size) {
        const internals = this[kInternals];
        if (internals.onReadCallback) {
          internals.onReadCallback();
        }
        return super._read(size);
      }
      _transform(chunk, encoding, callback) {
        const internals = this[kInternals];
        const maxRate = internals.maxRate;
        const readableHighWaterMark = this.readableHighWaterMark;
        const timeWindow = internals.timeWindow;
        const divider = 1e3 / timeWindow;
        const bytesThreshold = maxRate / divider;
        const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
        const pushChunk = /* @__PURE__ */ __name((_chunk, _callback) => {
          const bytes = Buffer.byteLength(_chunk);
          internals.bytesSeen += bytes;
          internals.bytes += bytes;
          internals.isCaptured && this.emit("progress", internals.bytesSeen);
          if (this.push(_chunk)) {
            process.nextTick(_callback);
          } else {
            internals.onReadCallback = () => {
              internals.onReadCallback = null;
              process.nextTick(_callback);
            };
          }
        }, "pushChunk");
        const transformChunk = /* @__PURE__ */ __name((_chunk, _callback) => {
          const chunkSize = Buffer.byteLength(_chunk);
          let chunkRemainder = null;
          let maxChunkSize = readableHighWaterMark;
          let bytesLeft;
          let passed = 0;
          if (maxRate) {
            const now = Date.now();
            if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
              internals.ts = now;
              bytesLeft = bytesThreshold - internals.bytes;
              internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
              passed = 0;
            }
            bytesLeft = bytesThreshold - internals.bytes;
          }
          if (maxRate) {
            if (bytesLeft <= 0) {
              return setTimeout(() => {
                _callback(null, _chunk);
              }, timeWindow - passed);
            }
            if (bytesLeft < maxChunkSize) {
              maxChunkSize = bytesLeft;
            }
          }
          if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
            chunkRemainder = _chunk.subarray(maxChunkSize);
            _chunk = _chunk.subarray(0, maxChunkSize);
          }
          pushChunk(_chunk, chunkRemainder ? () => {
            process.nextTick(_callback, null, chunkRemainder);
          } : _callback);
        }, "transformChunk");
        transformChunk(chunk, /* @__PURE__ */ __name(function transformNextChunk(err, _chunk) {
          if (err) {
            return callback(err);
          }
          if (_chunk) {
            transformChunk(_chunk, transformNextChunk);
          } else {
            callback(null);
          }
        }, "transformNextChunk"));
      }
    };
    var AxiosTransformStream$1 = AxiosTransformStream;
    var { asyncIterator } = Symbol;
    var readBlob = /* @__PURE__ */ __name(async function* (blob) {
      if (blob.stream) {
        yield* blob.stream();
      } else if (blob.arrayBuffer) {
        yield await blob.arrayBuffer();
      } else if (blob[asyncIterator]) {
        yield* blob[asyncIterator]();
      } else {
        yield blob;
      }
    }, "readBlob");
    var readBlob$1 = readBlob;
    var BOUNDARY_ALPHABET = platform.ALPHABET.ALPHA_DIGIT + "-_";
    var textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util__default["default"].TextEncoder();
    var CRLF = "\r\n";
    var CRLF_BYTES = textEncoder.encode(CRLF);
    var CRLF_BYTES_COUNT = 2;
    var FormDataPart = class {
      static {
        __name(this, "FormDataPart");
      }
      constructor(name, value) {
        const { escapeName } = this.constructor;
        const isStringValue = utils$1.isString(value);
        let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
        if (isStringValue) {
          value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
        } else {
          headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
        }
        this.headers = textEncoder.encode(headers + CRLF);
        this.contentLength = isStringValue ? value.byteLength : value.size;
        this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
        this.name = name;
        this.value = value;
      }
      async *encode() {
        yield this.headers;
        const { value } = this;
        if (utils$1.isTypedArray(value)) {
          yield value;
        } else {
          yield* readBlob$1(value);
        }
        yield CRLF_BYTES;
      }
      static escapeName(name) {
        return String(name).replace(/[\r\n"]/g, (match) => ({
          "\r": "%0D",
          "\n": "%0A",
          '"': "%22"
        })[match]);
      }
    };
    var formDataToStream = /* @__PURE__ */ __name((form, headersHandler, options) => {
      const {
        tag = "form-data-boundary",
        size = 25,
        boundary = tag + "-" + platform.generateString(size, BOUNDARY_ALPHABET)
      } = options || {};
      if (!utils$1.isFormData(form)) {
        throw TypeError("FormData instance required");
      }
      if (boundary.length < 1 || boundary.length > 70) {
        throw Error("boundary must be 10-70 characters long");
      }
      const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
      const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
      let contentLength = footerBytes.byteLength;
      const parts = Array.from(form.entries()).map(([name, value]) => {
        const part = new FormDataPart(name, value);
        contentLength += part.size;
        return part;
      });
      contentLength += boundaryBytes.byteLength * parts.length;
      contentLength = utils$1.toFiniteNumber(contentLength);
      const computedHeaders = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      };
      if (Number.isFinite(contentLength)) {
        computedHeaders["Content-Length"] = contentLength;
      }
      headersHandler && headersHandler(computedHeaders);
      return stream.Readable.from(async function* () {
        for (const part of parts) {
          yield boundaryBytes;
          yield* part.encode();
        }
        yield footerBytes;
      }());
    }, "formDataToStream");
    var formDataToStream$1 = formDataToStream;
    var ZlibHeaderTransformStream = class extends stream__default["default"].Transform {
      static {
        __name(this, "ZlibHeaderTransformStream");
      }
      __transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
      _transform(chunk, encoding, callback) {
        if (chunk.length !== 0) {
          this._transform = this.__transform;
          if (chunk[0] !== 120) {
            const header = Buffer.alloc(2);
            header[0] = 120;
            header[1] = 156;
            this.push(header, encoding);
          }
        }
        this.__transform(chunk, encoding, callback);
      }
    };
    var ZlibHeaderTransformStream$1 = ZlibHeaderTransformStream;
    var callbackify = /* @__PURE__ */ __name((fn, reducer) => {
      return utils$1.isAsyncFn(fn) ? function(...args) {
        const cb = args.pop();
        fn.apply(this, args).then((value) => {
          try {
            reducer ? cb(null, ...reducer(value)) : cb(null, value);
          } catch (err) {
            cb(err);
          }
        }, cb);
      } : fn;
    }, "callbackify");
    var callbackify$1 = callbackify;
    function speedometer(samplesCount, min) {
      samplesCount = samplesCount || 10;
      const bytes = new Array(samplesCount);
      const timestamps = new Array(samplesCount);
      let head = 0;
      let tail = 0;
      let firstSampleTS;
      min = min !== void 0 ? min : 1e3;
      return /* @__PURE__ */ __name(function push(chunkLength) {
        const now = Date.now();
        const startedAt = timestamps[tail];
        if (!firstSampleTS) {
          firstSampleTS = now;
        }
        bytes[head] = chunkLength;
        timestamps[head] = now;
        let i = tail;
        let bytesCount = 0;
        while (i !== head) {
          bytesCount += bytes[i++];
          i = i % samplesCount;
        }
        head = (head + 1) % samplesCount;
        if (head === tail) {
          tail = (tail + 1) % samplesCount;
        }
        if (now - firstSampleTS < min) {
          return;
        }
        const passed = startedAt && now - startedAt;
        return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
      }, "push");
    }
    __name(speedometer, "speedometer");
    function throttle(fn, freq) {
      let timestamp = 0;
      let threshold = 1e3 / freq;
      let lastArgs;
      let timer;
      const invoke = /* @__PURE__ */ __name((args, now = Date.now()) => {
        timestamp = now;
        lastArgs = null;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        fn(...args);
      }, "invoke");
      const throttled = /* @__PURE__ */ __name((...args) => {
        const now = Date.now();
        const passed = now - timestamp;
        if (passed >= threshold) {
          invoke(args, now);
        } else {
          lastArgs = args;
          if (!timer) {
            timer = setTimeout(() => {
              timer = null;
              invoke(lastArgs);
            }, threshold - passed);
          }
        }
      }, "throttled");
      const flush = /* @__PURE__ */ __name(() => lastArgs && invoke(lastArgs), "flush");
      return [throttled, flush];
    }
    __name(throttle, "throttle");
    var progressEventReducer = /* @__PURE__ */ __name((listener, isDownloadStream, freq = 3) => {
      let bytesNotified = 0;
      const _speedometer = speedometer(50, 250);
      return throttle((e) => {
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : void 0;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;
        bytesNotified = loaded;
        const data = {
          loaded,
          total,
          progress: total ? loaded / total : void 0,
          bytes: progressBytes,
          rate: rate ? rate : void 0,
          estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
          event: e,
          lengthComputable: total != null,
          [isDownloadStream ? "download" : "upload"]: true
        };
        listener(data);
      }, freq);
    }, "progressEventReducer");
    var progressEventDecorator = /* @__PURE__ */ __name((total, throttled) => {
      const lengthComputable = total != null;
      return [(loaded) => throttled[0]({
        lengthComputable,
        total,
        loaded
      }), throttled[1]];
    }, "progressEventDecorator");
    var asyncDecorator = /* @__PURE__ */ __name((fn) => (...args) => utils$1.asap(() => fn(...args)), "asyncDecorator");
    function estimateDataURLDecodedBytes(url2) {
      if (!url2 || typeof url2 !== "string") return 0;
      if (!url2.startsWith("data:")) return 0;
      const comma = url2.indexOf(",");
      if (comma < 0) return 0;
      const meta = url2.slice(5, comma);
      const body = url2.slice(comma + 1);
      const isBase64 = /;base64/i.test(meta);
      if (isBase64) {
        let effectiveLen = body.length;
        const len = body.length;
        for (let i = 0; i < len; i++) {
          if (body.charCodeAt(i) === 37 && i + 2 < len) {
            const a = body.charCodeAt(i + 1);
            const b = body.charCodeAt(i + 2);
            const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
            if (isHex) {
              effectiveLen -= 2;
              i += 2;
            }
          }
        }
        let pad = 0;
        let idx = len - 1;
        const tailIsPct3D = /* @__PURE__ */ __name((j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
        body.charCodeAt(j - 1) === 51 && // '3'
        (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100), "tailIsPct3D");
        if (idx >= 0) {
          if (body.charCodeAt(idx) === 61) {
            pad++;
            idx--;
          } else if (tailIsPct3D(idx)) {
            pad++;
            idx -= 3;
          }
        }
        if (pad === 1 && idx >= 0) {
          if (body.charCodeAt(idx) === 61) {
            pad++;
          } else if (tailIsPct3D(idx)) {
            pad++;
          }
        }
        const groups = Math.floor(effectiveLen / 4);
        const bytes = groups * 3 - (pad || 0);
        return bytes > 0 ? bytes : 0;
      }
      return Buffer.byteLength(body, "utf8");
    }
    __name(estimateDataURLDecodedBytes, "estimateDataURLDecodedBytes");
    var zlibOptions = {
      flush: zlib__default["default"].constants.Z_SYNC_FLUSH,
      finishFlush: zlib__default["default"].constants.Z_SYNC_FLUSH
    };
    var brotliOptions = {
      flush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH,
      finishFlush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH
    };
    var isBrotliSupported = utils$1.isFunction(zlib__default["default"].createBrotliDecompress);
    var { http: httpFollow, https: httpsFollow } = followRedirects__default["default"];
    var isHttps = /https:?/;
    var supportedProtocols = platform.protocols.map((protocol) => {
      return protocol + ":";
    });
    var flushOnFinish = /* @__PURE__ */ __name((stream2, [throttled, flush]) => {
      stream2.on("end", flush).on("error", flush);
      return throttled;
    }, "flushOnFinish");
    var Http2Sessions = class {
      static {
        __name(this, "Http2Sessions");
      }
      constructor() {
        this.sessions = /* @__PURE__ */ Object.create(null);
      }
      getSession(authority, options) {
        options = Object.assign({
          sessionTimeout: 1e3
        }, options);
        let authoritySessions = this.sessions[authority];
        if (authoritySessions) {
          let len = authoritySessions.length;
          for (let i = 0; i < len; i++) {
            const [sessionHandle, sessionOptions] = authoritySessions[i];
            if (!sessionHandle.destroyed && !sessionHandle.closed && util__default["default"].isDeepStrictEqual(sessionOptions, options)) {
              return sessionHandle;
            }
          }
        }
        const session = http2__default["default"].connect(authority, options);
        let removed;
        const removeSession = /* @__PURE__ */ __name(() => {
          if (removed) {
            return;
          }
          removed = true;
          let entries = authoritySessions, len = entries.length, i = len;
          while (i--) {
            if (entries[i][0] === session) {
              if (len === 1) {
                delete this.sessions[authority];
              } else {
                entries.splice(i, 1);
              }
              return;
            }
          }
        }, "removeSession");
        const originalRequestFn = session.request;
        const { sessionTimeout } = options;
        if (sessionTimeout != null) {
          let timer;
          let streamsCount = 0;
          session.request = function() {
            const stream2 = originalRequestFn.apply(this, arguments);
            streamsCount++;
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            stream2.once("close", () => {
              if (!--streamsCount) {
                timer = setTimeout(() => {
                  timer = null;
                  removeSession();
                }, sessionTimeout);
              }
            });
            return stream2;
          };
        }
        session.once("close", removeSession);
        let entry = [
          session,
          options
        ];
        authoritySessions ? authoritySessions.push(entry) : authoritySessions = this.sessions[authority] = [entry];
        return session;
      }
    };
    var http2Sessions = new Http2Sessions();
    function dispatchBeforeRedirect(options, responseDetails) {
      if (options.beforeRedirects.proxy) {
        options.beforeRedirects.proxy(options);
      }
      if (options.beforeRedirects.config) {
        options.beforeRedirects.config(options, responseDetails);
      }
    }
    __name(dispatchBeforeRedirect, "dispatchBeforeRedirect");
    function setProxy(options, configProxy, location) {
      let proxy = configProxy;
      if (!proxy && proxy !== false) {
        const proxyUrl = proxyFromEnv__default["default"].getProxyForUrl(location);
        if (proxyUrl) {
          proxy = new URL(proxyUrl);
        }
      }
      if (proxy) {
        if (proxy.username) {
          proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
        }
        if (proxy.auth) {
          const validProxyAuth = Boolean(proxy.auth.username || proxy.auth.password);
          if (validProxyAuth) {
            proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
          } else if (typeof proxy.auth === "object") {
            throw new AxiosError$1("Invalid proxy authorization", AxiosError$1.ERR_BAD_OPTION, { proxy });
          }
          const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
          options.headers["Proxy-Authorization"] = "Basic " + base64;
        }
        options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
        const proxyHost = proxy.hostname || proxy.host;
        options.hostname = proxyHost;
        options.host = proxyHost;
        options.port = proxy.port;
        options.path = location;
        if (proxy.protocol) {
          options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
        }
      }
      options.beforeRedirects.proxy = /* @__PURE__ */ __name(function beforeRedirect(redirectOptions) {
        setProxy(redirectOptions, configProxy, redirectOptions.href);
      }, "beforeRedirect");
    }
    __name(setProxy, "setProxy");
    var isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
    var wrapAsync = /* @__PURE__ */ __name((asyncExecutor) => {
      return new Promise((resolve, reject) => {
        let onDone;
        let isDone;
        const done = /* @__PURE__ */ __name((value, isRejected) => {
          if (isDone) return;
          isDone = true;
          onDone && onDone(value, isRejected);
        }, "done");
        const _resolve = /* @__PURE__ */ __name((value) => {
          done(value);
          resolve(value);
        }, "_resolve");
        const _reject = /* @__PURE__ */ __name((reason) => {
          done(reason, true);
          reject(reason);
        }, "_reject");
        asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
      });
    }, "wrapAsync");
    var resolveFamily = /* @__PURE__ */ __name(({ address, family }) => {
      if (!utils$1.isString(address)) {
        throw TypeError("address must be a string");
      }
      return {
        address,
        family: family || (address.indexOf(".") < 0 ? 6 : 4)
      };
    }, "resolveFamily");
    var buildAddressEntry = /* @__PURE__ */ __name((address, family) => resolveFamily(utils$1.isObject(address) ? address : { address, family }), "buildAddressEntry");
    var http2Transport = {
      request(options, cb) {
        const authority = options.protocol + "//" + options.hostname + ":" + (options.port || (options.protocol === "https:" ? 443 : 80));
        const { http2Options, headers } = options;
        const session = http2Sessions.getSession(authority, http2Options);
        const {
          HTTP2_HEADER_SCHEME,
          HTTP2_HEADER_METHOD,
          HTTP2_HEADER_PATH,
          HTTP2_HEADER_STATUS
        } = http2__default["default"].constants;
        const http2Headers = {
          [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
          [HTTP2_HEADER_METHOD]: options.method,
          [HTTP2_HEADER_PATH]: options.path
        };
        utils$1.forEach(headers, (header, name) => {
          name.charAt(0) !== ":" && (http2Headers[name] = header);
        });
        const req = session.request(http2Headers);
        req.once("response", (responseHeaders) => {
          const response = req;
          responseHeaders = Object.assign({}, responseHeaders);
          const status = responseHeaders[HTTP2_HEADER_STATUS];
          delete responseHeaders[HTTP2_HEADER_STATUS];
          response.headers = responseHeaders;
          response.statusCode = +status;
          cb(response);
        });
        return req;
      }
    };
    var httpAdapter = isHttpAdapterSupported && /* @__PURE__ */ __name(function httpAdapter2(config) {
      return wrapAsync(/* @__PURE__ */ __name(async function dispatchHttpRequest(resolve, reject, onDone) {
        let { data, lookup, family, httpVersion = 1, http2Options } = config;
        const { responseType, responseEncoding } = config;
        const method = config.method.toUpperCase();
        let isDone;
        let rejected = false;
        let req;
        httpVersion = +httpVersion;
        if (Number.isNaN(httpVersion)) {
          throw TypeError(`Invalid protocol version: '${config.httpVersion}' is not a number`);
        }
        if (httpVersion !== 1 && httpVersion !== 2) {
          throw TypeError(`Unsupported protocol version '${httpVersion}'`);
        }
        const isHttp2 = httpVersion === 2;
        if (lookup) {
          const _lookup = callbackify$1(lookup, (value) => utils$1.isArray(value) ? value : [value]);
          lookup = /* @__PURE__ */ __name((hostname, opt, cb) => {
            _lookup(hostname, opt, (err, arg0, arg1) => {
              if (err) {
                return cb(err);
              }
              const addresses = utils$1.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
              opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
            });
          }, "lookup");
        }
        const abortEmitter = new events.EventEmitter();
        function abort(reason) {
          try {
            abortEmitter.emit("abort", !reason || reason.type ? new CanceledError$1(null, config, req) : reason);
          } catch (err) {
            console.warn("emit error", err);
          }
        }
        __name(abort, "abort");
        abortEmitter.once("abort", reject);
        const onFinished = /* @__PURE__ */ __name(() => {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(abort);
          }
          if (config.signal) {
            config.signal.removeEventListener("abort", abort);
          }
          abortEmitter.removeAllListeners();
        }, "onFinished");
        if (config.cancelToken || config.signal) {
          config.cancelToken && config.cancelToken.subscribe(abort);
          if (config.signal) {
            config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
          }
        }
        onDone((response, isRejected) => {
          isDone = true;
          if (isRejected) {
            rejected = true;
            onFinished();
            return;
          }
          const { data: data2 } = response;
          if (data2 instanceof stream__default["default"].Readable || data2 instanceof stream__default["default"].Duplex) {
            const offListeners = stream__default["default"].finished(data2, () => {
              offListeners();
              onFinished();
            });
          } else {
            onFinished();
          }
        });
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        const parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : void 0);
        const protocol = parsed.protocol || supportedProtocols[0];
        if (protocol === "data:") {
          if (config.maxContentLength > -1) {
            const dataUrl = String(config.url || fullPath || "");
            const estimated = estimateDataURLDecodedBytes(dataUrl);
            if (estimated > config.maxContentLength) {
              return reject(new AxiosError$1(
                "maxContentLength size of " + config.maxContentLength + " exceeded",
                AxiosError$1.ERR_BAD_RESPONSE,
                config
              ));
            }
          }
          let convertedData;
          if (method !== "GET") {
            return settle(resolve, reject, {
              status: 405,
              statusText: "method not allowed",
              headers: {},
              config
            });
          }
          try {
            convertedData = fromDataURI(config.url, responseType === "blob", {
              Blob: config.env && config.env.Blob
            });
          } catch (err) {
            throw AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config);
          }
          if (responseType === "text") {
            convertedData = convertedData.toString(responseEncoding);
            if (!responseEncoding || responseEncoding === "utf8") {
              convertedData = utils$1.stripBOM(convertedData);
            }
          } else if (responseType === "stream") {
            convertedData = stream__default["default"].Readable.from(convertedData);
          }
          return settle(resolve, reject, {
            data: convertedData,
            status: 200,
            statusText: "OK",
            headers: new AxiosHeaders$1(),
            config
          });
        }
        if (supportedProtocols.indexOf(protocol) === -1) {
          return reject(new AxiosError$1(
            "Unsupported protocol " + protocol,
            AxiosError$1.ERR_BAD_REQUEST,
            config
          ));
        }
        const headers = AxiosHeaders$1.from(config.headers).normalize();
        headers.set("User-Agent", "axios/" + VERSION, false);
        const { onUploadProgress, onDownloadProgress } = config;
        const maxRate = config.maxRate;
        let maxUploadRate = void 0;
        let maxDownloadRate = void 0;
        if (utils$1.isSpecCompliantForm(data)) {
          const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
          data = formDataToStream$1(data, (formHeaders) => {
            headers.set(formHeaders);
          }, {
            tag: `axios-${VERSION}-boundary`,
            boundary: userBoundary && userBoundary[1] || void 0
          });
        } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders)) {
          headers.set(data.getHeaders());
          if (!headers.hasContentLength()) {
            try {
              const knownLength = await util__default["default"].promisify(data.getLength).call(data);
              Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
            } catch (e) {
            }
          }
        } else if (utils$1.isBlob(data) || utils$1.isFile(data)) {
          data.size && headers.setContentType(data.type || "application/octet-stream");
          headers.setContentLength(data.size || 0);
          data = stream__default["default"].Readable.from(readBlob$1(data));
        } else if (data && !utils$1.isStream(data)) {
          if (Buffer.isBuffer(data)) ;
          else if (utils$1.isArrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
          } else if (utils$1.isString(data)) {
            data = Buffer.from(data, "utf-8");
          } else {
            return reject(new AxiosError$1(
              "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
              AxiosError$1.ERR_BAD_REQUEST,
              config
            ));
          }
          headers.setContentLength(data.length, false);
          if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
            return reject(new AxiosError$1(
              "Request body larger than maxBodyLength limit",
              AxiosError$1.ERR_BAD_REQUEST,
              config
            ));
          }
        }
        const contentLength = utils$1.toFiniteNumber(headers.getContentLength());
        if (utils$1.isArray(maxRate)) {
          maxUploadRate = maxRate[0];
          maxDownloadRate = maxRate[1];
        } else {
          maxUploadRate = maxDownloadRate = maxRate;
        }
        if (data && (onUploadProgress || maxUploadRate)) {
          if (!utils$1.isStream(data)) {
            data = stream__default["default"].Readable.from(data, { objectMode: false });
          }
          data = stream__default["default"].pipeline([data, new AxiosTransformStream$1({
            maxRate: utils$1.toFiniteNumber(maxUploadRate)
          })], utils$1.noop);
          onUploadProgress && data.on("progress", flushOnFinish(
            data,
            progressEventDecorator(
              contentLength,
              progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
            )
          ));
        }
        let auth = void 0;
        if (config.auth) {
          const username = config.auth.username || "";
          const password = config.auth.password || "";
          auth = username + ":" + password;
        }
        if (!auth && parsed.username) {
          const urlUsername = parsed.username;
          const urlPassword = parsed.password;
          auth = urlUsername + ":" + urlPassword;
        }
        auth && headers.delete("authorization");
        let path;
        try {
          path = buildURL(
            parsed.pathname + parsed.search,
            config.params,
            config.paramsSerializer
          ).replace(/^\?/, "");
        } catch (err) {
          const customErr = new Error(err.message);
          customErr.config = config;
          customErr.url = config.url;
          customErr.exists = true;
          return reject(customErr);
        }
        headers.set(
          "Accept-Encoding",
          "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
          false
        );
        const options = {
          path,
          method,
          headers: headers.toJSON(),
          agents: { http: config.httpAgent, https: config.httpsAgent },
          auth,
          protocol,
          family,
          beforeRedirect: dispatchBeforeRedirect,
          beforeRedirects: {},
          http2Options
        };
        !utils$1.isUndefined(lookup) && (options.lookup = lookup);
        if (config.socketPath) {
          options.socketPath = config.socketPath;
        } else {
          options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
          options.port = parsed.port;
          setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
        }
        let transport;
        const isHttpsRequest = isHttps.test(options.protocol);
        options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        if (isHttp2) {
          transport = http2Transport;
        } else {
          if (config.transport) {
            transport = config.transport;
          } else if (config.maxRedirects === 0) {
            transport = isHttpsRequest ? https__default["default"] : http__default["default"];
          } else {
            if (config.maxRedirects) {
              options.maxRedirects = config.maxRedirects;
            }
            if (config.beforeRedirect) {
              options.beforeRedirects.config = config.beforeRedirect;
            }
            transport = isHttpsRequest ? httpsFollow : httpFollow;
          }
        }
        if (config.maxBodyLength > -1) {
          options.maxBodyLength = config.maxBodyLength;
        } else {
          options.maxBodyLength = Infinity;
        }
        if (config.insecureHTTPParser) {
          options.insecureHTTPParser = config.insecureHTTPParser;
        }
        req = transport.request(options, /* @__PURE__ */ __name(function handleResponse(res) {
          if (req.destroyed) return;
          const streams = [res];
          const responseLength = utils$1.toFiniteNumber(res.headers["content-length"]);
          if (onDownloadProgress || maxDownloadRate) {
            const transformStream = new AxiosTransformStream$1({
              maxRate: utils$1.toFiniteNumber(maxDownloadRate)
            });
            onDownloadProgress && transformStream.on("progress", flushOnFinish(
              transformStream,
              progressEventDecorator(
                responseLength,
                progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
              )
            ));
            streams.push(transformStream);
          }
          let responseStream = res;
          const lastRequest = res.req || req;
          if (config.decompress !== false && res.headers["content-encoding"]) {
            if (method === "HEAD" || res.statusCode === 204) {
              delete res.headers["content-encoding"];
            }
            switch ((res.headers["content-encoding"] || "").toLowerCase()) {
              /*eslint default-case:0*/
              case "gzip":
              case "x-gzip":
              case "compress":
              case "x-compress":
                streams.push(zlib__default["default"].createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "deflate":
                streams.push(new ZlibHeaderTransformStream$1());
                streams.push(zlib__default["default"].createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "br":
                if (isBrotliSupported) {
                  streams.push(zlib__default["default"].createBrotliDecompress(brotliOptions));
                  delete res.headers["content-encoding"];
                }
            }
          }
          responseStream = streams.length > 1 ? stream__default["default"].pipeline(streams, utils$1.noop) : streams[0];
          const response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new AxiosHeaders$1(res.headers),
            config,
            request: lastRequest
          };
          if (responseType === "stream") {
            response.data = responseStream;
            settle(resolve, reject, response);
          } else {
            const responseBuffer = [];
            let totalResponseBytes = 0;
            responseStream.on("data", /* @__PURE__ */ __name(function handleStreamData(chunk) {
              responseBuffer.push(chunk);
              totalResponseBytes += chunk.length;
              if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                rejected = true;
                responseStream.destroy();
                abort(new AxiosError$1(
                  "maxContentLength size of " + config.maxContentLength + " exceeded",
                  AxiosError$1.ERR_BAD_RESPONSE,
                  config,
                  lastRequest
                ));
              }
            }, "handleStreamData"));
            responseStream.on("aborted", /* @__PURE__ */ __name(function handlerStreamAborted() {
              if (rejected) {
                return;
              }
              const err = new AxiosError$1(
                "stream has been aborted",
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                lastRequest
              );
              responseStream.destroy(err);
              reject(err);
            }, "handlerStreamAborted"));
            responseStream.on("error", /* @__PURE__ */ __name(function handleStreamError(err) {
              if (req.destroyed) return;
              reject(AxiosError$1.from(err, null, config, lastRequest));
            }, "handleStreamError"));
            responseStream.on("end", /* @__PURE__ */ __name(function handleStreamEnd() {
              try {
                let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                if (responseType !== "arraybuffer") {
                  responseData = responseData.toString(responseEncoding);
                  if (!responseEncoding || responseEncoding === "utf8") {
                    responseData = utils$1.stripBOM(responseData);
                  }
                }
                response.data = responseData;
              } catch (err) {
                return reject(AxiosError$1.from(err, null, config, response.request, response));
              }
              settle(resolve, reject, response);
            }, "handleStreamEnd"));
          }
          abortEmitter.once("abort", (err) => {
            if (!responseStream.destroyed) {
              responseStream.emit("error", err);
              responseStream.destroy();
            }
          });
        }, "handleResponse"));
        abortEmitter.once("abort", (err) => {
          if (req.close) {
            req.close();
          } else {
            req.destroy(err);
          }
        });
        req.on("error", /* @__PURE__ */ __name(function handleRequestError(err) {
          reject(AxiosError$1.from(err, null, config, req));
        }, "handleRequestError"));
        req.on("socket", /* @__PURE__ */ __name(function handleRequestSocket(socket) {
          socket.setKeepAlive(true, 1e3 * 60);
        }, "handleRequestSocket"));
        if (config.timeout) {
          const timeout = parseInt(config.timeout, 10);
          if (Number.isNaN(timeout)) {
            abort(new AxiosError$1(
              "error trying to parse `config.timeout` to int",
              AxiosError$1.ERR_BAD_OPTION_VALUE,
              config,
              req
            ));
            return;
          }
          req.setTimeout(timeout, /* @__PURE__ */ __name(function handleRequestTimeout() {
            if (isDone) return;
            let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
            const transitional = config.transitional || transitionalDefaults;
            if (config.timeoutErrorMessage) {
              timeoutErrorMessage = config.timeoutErrorMessage;
            }
            abort(new AxiosError$1(
              timeoutErrorMessage,
              transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
              config,
              req
            ));
          }, "handleRequestTimeout"));
        } else {
          req.setTimeout(0);
        }
        if (utils$1.isStream(data)) {
          let ended = false;
          let errored = false;
          data.on("end", () => {
            ended = true;
          });
          data.once("error", (err) => {
            errored = true;
            req.destroy(err);
          });
          data.on("close", () => {
            if (!ended && !errored) {
              abort(new CanceledError$1("Request stream has been aborted", config, req));
            }
          });
          data.pipe(req);
        } else {
          data && req.write(data);
          req.end();
        }
      }, "dispatchHttpRequest"));
    }, "httpAdapter");
    var isURLSameOrigin = platform.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
      url2 = new URL(url2, platform.origin);
      return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
    })(
      new URL(platform.origin),
      platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
    ) : () => true;
    var cookies = platform.hasStandardBrowserEnv ? (
      // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure, sameSite) {
          if (typeof document === "undefined") return;
          const cookie = [`${name}=${encodeURIComponent(value)}`];
          if (utils$1.isNumber(expires)) {
            cookie.push(`expires=${new Date(expires).toUTCString()}`);
          }
          if (utils$1.isString(path)) {
            cookie.push(`path=${path}`);
          }
          if (utils$1.isString(domain)) {
            cookie.push(`domain=${domain}`);
          }
          if (secure === true) {
            cookie.push("secure");
          }
          if (utils$1.isString(sameSite)) {
            cookie.push(`SameSite=${sameSite}`);
          }
          document.cookie = cookie.join("; ");
        },
        read(name) {
          if (typeof document === "undefined") return null;
          const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
          return match ? decodeURIComponent(match[1]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 864e5, "/");
        }
      }
    ) : (
      // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {
        },
        read() {
          return null;
        },
        remove() {
        }
      }
    );
    var headersToObject = /* @__PURE__ */ __name((thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing, "headersToObject");
    function mergeConfig(config1, config2) {
      config2 = config2 || {};
      const config = {};
      function getMergedValue(target, source, prop, caseless) {
        if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
          return utils$1.merge.call({ caseless }, target, source);
        } else if (utils$1.isPlainObject(source)) {
          return utils$1.merge({}, source);
        } else if (utils$1.isArray(source)) {
          return source.slice();
        }
        return source;
      }
      __name(getMergedValue, "getMergedValue");
      function mergeDeepProperties(a, b, prop, caseless) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(a, b, prop, caseless);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(void 0, a, prop, caseless);
        }
      }
      __name(mergeDeepProperties, "mergeDeepProperties");
      function valueFromConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(void 0, b);
        }
      }
      __name(valueFromConfig2, "valueFromConfig2");
      function defaultToConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(void 0, b);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(void 0, a);
        }
      }
      __name(defaultToConfig2, "defaultToConfig2");
      function mergeDirectKeys(a, b, prop) {
        if (prop in config2) {
          return getMergedValue(a, b);
        } else if (prop in config1) {
          return getMergedValue(void 0, a);
        }
      }
      __name(mergeDirectKeys, "mergeDirectKeys");
      const mergeMap = {
        url: valueFromConfig2,
        method: valueFromConfig2,
        data: valueFromConfig2,
        baseURL: defaultToConfig2,
        transformRequest: defaultToConfig2,
        transformResponse: defaultToConfig2,
        paramsSerializer: defaultToConfig2,
        timeout: defaultToConfig2,
        timeoutMessage: defaultToConfig2,
        withCredentials: defaultToConfig2,
        withXSRFToken: defaultToConfig2,
        adapter: defaultToConfig2,
        responseType: defaultToConfig2,
        xsrfCookieName: defaultToConfig2,
        xsrfHeaderName: defaultToConfig2,
        onUploadProgress: defaultToConfig2,
        onDownloadProgress: defaultToConfig2,
        decompress: defaultToConfig2,
        maxContentLength: defaultToConfig2,
        maxBodyLength: defaultToConfig2,
        beforeRedirect: defaultToConfig2,
        transport: defaultToConfig2,
        httpAgent: defaultToConfig2,
        httpsAgent: defaultToConfig2,
        cancelToken: defaultToConfig2,
        socketPath: defaultToConfig2,
        responseEncoding: defaultToConfig2,
        validateStatus: mergeDirectKeys,
        headers: /* @__PURE__ */ __name((a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true), "headers")
      };
      utils$1.forEach(
        Object.keys({ ...config1, ...config2 }),
        /* @__PURE__ */ __name(function computeConfigValue(prop) {
          if (prop === "__proto__" || prop === "constructor" || prop === "prototype")
            return;
          const merge2 = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
          const configValue = merge2(config1[prop], config2[prop], prop);
          utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
        }, "computeConfigValue")
      );
      return config;
    }
    __name(mergeConfig, "mergeConfig");
    var resolveConfig = /* @__PURE__ */ __name((config) => {
      const newConfig = mergeConfig({}, config);
      let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
      newConfig.headers = headers = AxiosHeaders$1.from(headers);
      newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
      if (auth) {
        headers.set(
          "Authorization",
          "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
        );
      }
      if (utils$1.isFormData(data)) {
        if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
          headers.setContentType(void 0);
        } else if (utils$1.isFunction(data.getHeaders)) {
          const formHeaders = data.getHeaders();
          const allowedHeaders = ["content-type", "content-length"];
          Object.entries(formHeaders).forEach(([key, val]) => {
            if (allowedHeaders.includes(key.toLowerCase())) {
              headers.set(key, val);
            }
          });
        }
      }
      if (platform.hasStandardBrowserEnv) {
        withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
        if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin(newConfig.url)) {
          const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
          if (xsrfValue) {
            headers.set(xsrfHeaderName, xsrfValue);
          }
        }
      }
      return newConfig;
    }, "resolveConfig");
    var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
    var xhrAdapter = isXHRAdapterSupported && function(config) {
      return new Promise(/* @__PURE__ */ __name(function dispatchXhrRequest(resolve, reject) {
        const _config = resolveConfig(config);
        let requestData = _config.data;
        const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
        let { responseType, onUploadProgress, onDownloadProgress } = _config;
        let onCanceled;
        let uploadThrottled, downloadThrottled;
        let flushUpload, flushDownload;
        function done() {
          flushUpload && flushUpload();
          flushDownload && flushDownload();
          _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
          _config.signal && _config.signal.removeEventListener("abort", onCanceled);
        }
        __name(done, "done");
        let request = new XMLHttpRequest();
        request.open(_config.method.toUpperCase(), _config.url, true);
        request.timeout = _config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          const responseHeaders = AxiosHeaders$1.from(
            "getAllResponseHeaders" in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(/* @__PURE__ */ __name(function _resolve(value) {
            resolve(value);
            done();
          }, "_resolve"), /* @__PURE__ */ __name(function _reject(err) {
            reject(err);
            done();
          }, "_reject"), response);
          request = null;
        }
        __name(onloadend, "onloadend");
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = /* @__PURE__ */ __name(function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
              return;
            }
            setTimeout(onloadend);
          }, "handleLoad");
        }
        request.onabort = /* @__PURE__ */ __name(function handleAbort() {
          if (!request) {
            return;
          }
          reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
          request = null;
        }, "handleAbort");
        request.onerror = /* @__PURE__ */ __name(function handleError(event) {
          const msg = event && event.message ? event.message : "Network Error";
          const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
          err.event = event || null;
          reject(err);
          request = null;
        }, "handleError");
        request.ontimeout = /* @__PURE__ */ __name(function handleTimeout() {
          let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
          const transitional = _config.transitional || transitionalDefaults;
          if (_config.timeoutErrorMessage) {
            timeoutErrorMessage = _config.timeoutErrorMessage;
          }
          reject(new AxiosError$1(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
            config,
            request
          ));
          request = null;
        }, "handleTimeout");
        requestData === void 0 && requestHeaders.setContentType(null);
        if ("setRequestHeader" in request) {
          utils$1.forEach(requestHeaders.toJSON(), /* @__PURE__ */ __name(function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          }, "setRequestHeader"));
        }
        if (!utils$1.isUndefined(_config.withCredentials)) {
          request.withCredentials = !!_config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = _config.responseType;
        }
        if (onDownloadProgress) {
          [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
          request.addEventListener("progress", downloadThrottled);
        }
        if (onUploadProgress && request.upload) {
          [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
          request.upload.addEventListener("progress", uploadThrottled);
          request.upload.addEventListener("loadend", flushUpload);
        }
        if (_config.cancelToken || _config.signal) {
          onCanceled = /* @__PURE__ */ __name((cancel) => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
            request.abort();
            request = null;
          }, "onCanceled");
          _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
          if (_config.signal) {
            _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
          }
        }
        const protocol = parseProtocol(_config.url);
        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(new AxiosError$1("Unsupported protocol " + protocol + ":", AxiosError$1.ERR_BAD_REQUEST, config));
          return;
        }
        request.send(requestData || null);
      }, "dispatchXhrRequest"));
    };
    var composeSignals = /* @__PURE__ */ __name((signals, timeout) => {
      const { length } = signals = signals ? signals.filter(Boolean) : [];
      if (timeout || length) {
        let controller = new AbortController();
        let aborted;
        const onabort = /* @__PURE__ */ __name(function(reason) {
          if (!aborted) {
            aborted = true;
            unsubscribe();
            const err = reason instanceof Error ? reason : this.reason;
            controller.abort(err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err));
          }
        }, "onabort");
        let timer = timeout && setTimeout(() => {
          timer = null;
          onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
        }, timeout);
        const unsubscribe = /* @__PURE__ */ __name(() => {
          if (signals) {
            timer && clearTimeout(timer);
            timer = null;
            signals.forEach((signal2) => {
              signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
            });
            signals = null;
          }
        }, "unsubscribe");
        signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
        const { signal } = controller;
        signal.unsubscribe = () => utils$1.asap(unsubscribe);
        return signal;
      }
    }, "composeSignals");
    var composeSignals$1 = composeSignals;
    var streamChunk = /* @__PURE__ */ __name(function* (chunk, chunkSize) {
      let len = chunk.byteLength;
      if (!chunkSize || len < chunkSize) {
        yield chunk;
        return;
      }
      let pos = 0;
      let end;
      while (pos < len) {
        end = pos + chunkSize;
        yield chunk.slice(pos, end);
        pos = end;
      }
    }, "streamChunk");
    var readBytes = /* @__PURE__ */ __name(async function* (iterable, chunkSize) {
      for await (const chunk of readStream(iterable)) {
        yield* streamChunk(chunk, chunkSize);
      }
    }, "readBytes");
    var readStream = /* @__PURE__ */ __name(async function* (stream2) {
      if (stream2[Symbol.asyncIterator]) {
        yield* stream2;
        return;
      }
      const reader = stream2.getReader();
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          yield value;
        }
      } finally {
        await reader.cancel();
      }
    }, "readStream");
    var trackStream = /* @__PURE__ */ __name((stream2, chunkSize, onProgress, onFinish) => {
      const iterator2 = readBytes(stream2, chunkSize);
      let bytes = 0;
      let done;
      let _onFinish = /* @__PURE__ */ __name((e) => {
        if (!done) {
          done = true;
          onFinish && onFinish(e);
        }
      }, "_onFinish");
      return new ReadableStream({
        async pull(controller) {
          try {
            const { done: done2, value } = await iterator2.next();
            if (done2) {
              _onFinish();
              controller.close();
              return;
            }
            let len = value.byteLength;
            if (onProgress) {
              let loadedBytes = bytes += len;
              onProgress(loadedBytes);
            }
            controller.enqueue(new Uint8Array(value));
          } catch (err) {
            _onFinish(err);
            throw err;
          }
        },
        cancel(reason) {
          _onFinish(reason);
          return iterator2.return();
        }
      }, {
        highWaterMark: 2
      });
    }, "trackStream");
    var DEFAULT_CHUNK_SIZE = 64 * 1024;
    var { isFunction } = utils$1;
    var globalFetchAPI = (({ Request, Response }) => ({
      Request,
      Response
    }))(utils$1.global);
    var {
      ReadableStream: ReadableStream$1,
      TextEncoder: TextEncoder$1
    } = utils$1.global;
    var test = /* @__PURE__ */ __name((fn, ...args) => {
      try {
        return !!fn(...args);
      } catch (e) {
        return false;
      }
    }, "test");
    var factory = /* @__PURE__ */ __name((env) => {
      env = utils$1.merge.call({
        skipUndefined: true
      }, globalFetchAPI, env);
      const { fetch: envFetch, Request, Response } = env;
      const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
      const isRequestSupported = isFunction(Request);
      const isResponseSupported = isFunction(Response);
      if (!isFetchSupported) {
        return false;
      }
      const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream$1);
      const encodeText = isFetchSupported && (typeof TextEncoder$1 === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder$1()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
      const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
        let duplexAccessed = false;
        const hasContentType = new Request(platform.origin, {
          body: new ReadableStream$1(),
          method: "POST",
          get duplex() {
            duplexAccessed = true;
            return "half";
          }
        }).headers.has("Content-Type");
        return duplexAccessed && !hasContentType;
      });
      const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
      const resolvers = {
        stream: supportsResponseStream && ((res) => res.body)
      };
      isFetchSupported && (() => {
        ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
          !resolvers[type] && (resolvers[type] = (res, config) => {
            let method = res && res[type];
            if (method) {
              return method.call(res);
            }
            throw new AxiosError$1(`Response type '${type}' is not supported`, AxiosError$1.ERR_NOT_SUPPORT, config);
          });
        });
      })();
      const getBodyLength = /* @__PURE__ */ __name(async (body) => {
        if (body == null) {
          return 0;
        }
        if (utils$1.isBlob(body)) {
          return body.size;
        }
        if (utils$1.isSpecCompliantForm(body)) {
          const _request = new Request(platform.origin, {
            method: "POST",
            body
          });
          return (await _request.arrayBuffer()).byteLength;
        }
        if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
          return body.byteLength;
        }
        if (utils$1.isURLSearchParams(body)) {
          body = body + "";
        }
        if (utils$1.isString(body)) {
          return (await encodeText(body)).byteLength;
        }
      }, "getBodyLength");
      const resolveBodyLength = /* @__PURE__ */ __name(async (headers, body) => {
        const length = utils$1.toFiniteNumber(headers.getContentLength());
        return length == null ? getBodyLength(body) : length;
      }, "resolveBodyLength");
      return async (config) => {
        let {
          url: url2,
          method,
          data,
          signal,
          cancelToken,
          timeout,
          onDownloadProgress,
          onUploadProgress,
          responseType,
          headers,
          withCredentials = "same-origin",
          fetchOptions
        } = resolveConfig(config);
        let _fetch = envFetch || fetch;
        responseType = responseType ? (responseType + "").toLowerCase() : "text";
        let composedSignal = composeSignals$1([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
        let request = null;
        const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
          composedSignal.unsubscribe();
        });
        let requestContentLength;
        try {
          if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
            let _request = new Request(url2, {
              method: "POST",
              body: data,
              duplex: "half"
            });
            let contentTypeHeader;
            if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
              headers.setContentType(contentTypeHeader);
            }
            if (_request.body) {
              const [onProgress, flush] = progressEventDecorator(
                requestContentLength,
                progressEventReducer(asyncDecorator(onUploadProgress))
              );
              data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
            }
          }
          if (!utils$1.isString(withCredentials)) {
            withCredentials = withCredentials ? "include" : "omit";
          }
          const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
          const resolvedOptions = {
            ...fetchOptions,
            signal: composedSignal,
            method: method.toUpperCase(),
            headers: headers.normalize().toJSON(),
            body: data,
            duplex: "half",
            credentials: isCredentialsSupported ? withCredentials : void 0
          };
          request = isRequestSupported && new Request(url2, resolvedOptions);
          let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url2, resolvedOptions));
          const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
          if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
            const options = {};
            ["status", "statusText", "headers"].forEach((prop) => {
              options[prop] = response[prop];
            });
            const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
            const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
              responseContentLength,
              progressEventReducer(asyncDecorator(onDownloadProgress), true)
            ) || [];
            response = new Response(
              trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
                flush && flush();
                unsubscribe && unsubscribe();
              }),
              options
            );
          }
          responseType = responseType || "text";
          let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](response, config);
          !isStreamResponse && unsubscribe && unsubscribe();
          return await new Promise((resolve, reject) => {
            settle(resolve, reject, {
              data: responseData,
              headers: AxiosHeaders$1.from(response.headers),
              status: response.status,
              statusText: response.statusText,
              config,
              request
            });
          });
        } catch (err) {
          unsubscribe && unsubscribe();
          if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
            throw Object.assign(
              new AxiosError$1("Network Error", AxiosError$1.ERR_NETWORK, config, request, err && err.response),
              {
                cause: err.cause || err
              }
            );
          }
          throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
        }
      };
    }, "factory");
    var seedCache = /* @__PURE__ */ new Map();
    var getFetch = /* @__PURE__ */ __name((config) => {
      let env = config && config.env || {};
      const { fetch: fetch2, Request, Response } = env;
      const seeds = [
        Request,
        Response,
        fetch2
      ];
      let len = seeds.length, i = len, seed, target, map = seedCache;
      while (i--) {
        seed = seeds[i];
        target = map.get(seed);
        target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
        map = target;
      }
      return target;
    }, "getFetch");
    getFetch();
    var knownAdapters = {
      http: httpAdapter,
      xhr: xhrAdapter,
      fetch: {
        get: getFetch
      }
    };
    utils$1.forEach(knownAdapters, (fn, value) => {
      if (fn) {
        try {
          Object.defineProperty(fn, "name", { value });
        } catch (e) {
        }
        Object.defineProperty(fn, "adapterName", { value });
      }
    });
    var renderReason = /* @__PURE__ */ __name((reason) => `- ${reason}`, "renderReason");
    var isResolvedHandle = /* @__PURE__ */ __name((adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false, "isResolvedHandle");
    function getAdapter(adapters2, config) {
      adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
      const { length } = adapters2;
      let nameOrAdapter;
      let adapter;
      const rejectedReasons = {};
      for (let i = 0; i < length; i++) {
        nameOrAdapter = adapters2[i];
        let id;
        adapter = nameOrAdapter;
        if (!isResolvedHandle(nameOrAdapter)) {
          adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
          if (adapter === void 0) {
            throw new AxiosError$1(`Unknown adapter '${id}'`);
          }
        }
        if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
          break;
        }
        rejectedReasons[id || "#" + i] = adapter;
      }
      if (!adapter) {
        const reasons = Object.entries(rejectedReasons).map(
          ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
        );
        let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
        throw new AxiosError$1(
          `There is no suitable adapter to dispatch the request ` + s,
          "ERR_NOT_SUPPORT"
        );
      }
      return adapter;
    }
    __name(getAdapter, "getAdapter");
    var adapters = {
      /**
       * Resolve an adapter from a list of adapter names or functions.
       * @type {Function}
       */
      getAdapter,
      /**
       * Exposes all known adapters
       * @type {Object<string, Function|Object>}
       */
      adapters: knownAdapters
    };
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
      if (config.signal && config.signal.aborted) {
        throw new CanceledError$1(null, config);
      }
    }
    __name(throwIfCancellationRequested, "throwIfCancellationRequested");
    function dispatchRequest(config) {
      throwIfCancellationRequested(config);
      config.headers = AxiosHeaders$1.from(config.headers);
      config.data = transformData.call(
        config,
        config.transformRequest
      );
      if (["post", "put", "patch"].indexOf(config.method) !== -1) {
        config.headers.setContentType("application/x-www-form-urlencoded", false);
      }
      const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter, config);
      return adapter(config).then(/* @__PURE__ */ __name(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );
        response.headers = AxiosHeaders$1.from(response.headers);
        return response;
      }, "onAdapterResolution"), /* @__PURE__ */ __name(function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
          }
        }
        return Promise.reject(reason);
      }, "onAdapterRejection"));
    }
    __name(dispatchRequest, "dispatchRequest");
    var validators$1 = {};
    ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
      validators$1[type] = /* @__PURE__ */ __name(function validator2(thing) {
        return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
      }, "validator");
    });
    var deprecatedWarnings = {};
    validators$1.transitional = /* @__PURE__ */ __name(function transitional(validator2, version, message) {
      function formatMessage(opt, desc) {
        return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
      }
      __name(formatMessage, "formatMessage");
      return (value, opt, opts) => {
        if (validator2 === false) {
          throw new AxiosError$1(
            formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
            AxiosError$1.ERR_DEPRECATED
          );
        }
        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          console.warn(
            formatMessage(
              opt,
              " has been deprecated since v" + version + " and will be removed in the near future"
            )
          );
        }
        return validator2 ? validator2(value, opt, opts) : true;
      };
    }, "transitional");
    validators$1.spelling = /* @__PURE__ */ __name(function spelling(correctSpelling) {
      return (value, opt) => {
        console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
        return true;
      };
    }, "spelling");
    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== "object") {
        throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
      }
      const keys = Object.keys(options);
      let i = keys.length;
      while (i-- > 0) {
        const opt = keys[i];
        const validator2 = schema[opt];
        if (validator2) {
          const value = options[opt];
          const result = value === void 0 || validator2(value, opt, options);
          if (result !== true) {
            throw new AxiosError$1("option " + opt + " must be " + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
        }
      }
    }
    __name(assertOptions, "assertOptions");
    var validator = {
      assertOptions,
      validators: validators$1
    };
    var validators = validator.validators;
    var Axios = class {
      static {
        __name(this, "Axios");
      }
      constructor(instanceConfig) {
        this.defaults = instanceConfig || {};
        this.interceptors = {
          request: new InterceptorManager$1(),
          response: new InterceptorManager$1()
        };
      }
      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      async request(configOrUrl, config) {
        try {
          return await this._request(configOrUrl, config);
        } catch (err) {
          if (err instanceof Error) {
            let dummy = {};
            Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
            const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
            try {
              if (!err.stack) {
                err.stack = stack;
              } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
                err.stack += "\n" + stack;
              }
            } catch (e) {
            }
          }
          throw err;
        }
      }
      _request(configOrUrl, config) {
        if (typeof configOrUrl === "string") {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }
        config = mergeConfig(this.defaults, config);
        const { transitional, paramsSerializer, headers } = config;
        if (transitional !== void 0) {
          validator.assertOptions(transitional, {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean),
            legacyInterceptorReqResOrdering: validators.transitional(validators.boolean)
          }, false);
        }
        if (paramsSerializer != null) {
          if (utils$1.isFunction(paramsSerializer)) {
            config.paramsSerializer = {
              serialize: paramsSerializer
            };
          } else {
            validator.assertOptions(paramsSerializer, {
              encode: validators.function,
              serialize: validators.function
            }, true);
          }
        }
        if (config.allowAbsoluteUrls !== void 0) ;
        else if (this.defaults.allowAbsoluteUrls !== void 0) {
          config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
        } else {
          config.allowAbsoluteUrls = true;
        }
        validator.assertOptions(config, {
          baseUrl: validators.spelling("baseURL"),
          withXsrfToken: validators.spelling("withXSRFToken")
        }, true);
        config.method = (config.method || this.defaults.method || "get").toLowerCase();
        let contextHeaders = headers && utils$1.merge(
          headers.common,
          headers[config.method]
        );
        headers && utils$1.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (method) => {
            delete headers[method];
          }
        );
        config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(/* @__PURE__ */ __name(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
            return;
          }
          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
          const transitional2 = config.transitional || transitionalDefaults;
          const legacyInterceptorReqResOrdering = transitional2 && transitional2.legacyInterceptorReqResOrdering;
          if (legacyInterceptorReqResOrdering) {
            requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
          } else {
            requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
          }
        }, "unshiftRequestInterceptors"));
        const responseInterceptorChain = [];
        this.interceptors.response.forEach(/* @__PURE__ */ __name(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        }, "pushResponseInterceptors"));
        let promise;
        let i = 0;
        let len;
        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), void 0];
          chain.unshift(...requestInterceptorChain);
          chain.push(...responseInterceptorChain);
          len = chain.length;
          promise = Promise.resolve(config);
          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }
          return promise;
        }
        len = requestInterceptorChain.length;
        let newConfig = config;
        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }
        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }
        i = 0;
        len = responseInterceptorChain.length;
        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }
        return promise;
      }
      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    };
    utils$1.forEach(["delete", "get", "head", "options"], /* @__PURE__ */ __name(function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url2, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url: url2,
          data: (config || {}).data
        }));
      };
    }, "forEachMethodNoData"));
    utils$1.forEach(["post", "put", "patch"], /* @__PURE__ */ __name(function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
        return /* @__PURE__ */ __name(function httpMethod(url2, data, config) {
          return this.request(mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              "Content-Type": "multipart/form-data"
            } : {},
            url: url2,
            data
          }));
        }, "httpMethod");
      }
      __name(generateHTTPMethod, "generateHTTPMethod");
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    }, "forEachMethodWithData"));
    var Axios$1 = Axios;
    var CancelToken = class _CancelToken {
      static {
        __name(this, "CancelToken");
      }
      constructor(executor) {
        if (typeof executor !== "function") {
          throw new TypeError("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise(/* @__PURE__ */ __name(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        }, "promiseExecutor"));
        const token = this;
        this.promise.then((cancel) => {
          if (!token._listeners) return;
          let i = token._listeners.length;
          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });
        this.promise.then = (onfulfilled) => {
          let _resolve;
          const promise = new Promise((resolve) => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);
          promise.cancel = /* @__PURE__ */ __name(function reject() {
            token.unsubscribe(_resolve);
          }, "reject");
          return promise;
        };
        executor(/* @__PURE__ */ __name(function cancel(message, config, request) {
          if (token.reason) {
            return;
          }
          token.reason = new CanceledError$1(message, config, request);
          resolvePromise(token.reason);
        }, "cancel"));
      }
      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }
      /**
       * Subscribe to the cancel signal
       */
      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }
        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }
      /**
       * Unsubscribe from the cancel signal
       */
      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }
      toAbortSignal() {
        const controller = new AbortController();
        const abort = /* @__PURE__ */ __name((err) => {
          controller.abort(err);
        }, "abort");
        this.subscribe(abort);
        controller.signal.unsubscribe = () => this.unsubscribe(abort);
        return controller.signal;
      }
      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new _CancelToken(/* @__PURE__ */ __name(function executor(c) {
          cancel = c;
        }, "executor"));
        return {
          token,
          cancel
        };
      }
    };
    var CancelToken$1 = CancelToken;
    function spread(callback) {
      return /* @__PURE__ */ __name(function wrap(arr) {
        return callback.apply(null, arr);
      }, "wrap");
    }
    __name(spread, "spread");
    function isAxiosError(payload) {
      return utils$1.isObject(payload) && payload.isAxiosError === true;
    }
    __name(isAxiosError, "isAxiosError");
    var HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511,
      WebServerIsDown: 521,
      ConnectionTimedOut: 522,
      OriginIsUnreachable: 523,
      TimeoutOccurred: 524,
      SslHandshakeFailed: 525,
      InvalidSslCertificate: 526
    };
    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });
    var HttpStatusCode$1 = HttpStatusCode;
    function createInstance(defaultConfig) {
      const context = new Axios$1(defaultConfig);
      const instance = bind(Axios$1.prototype.request, context);
      utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
      utils$1.extend(instance, context, null, { allOwnKeys: true });
      instance.create = /* @__PURE__ */ __name(function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      }, "create");
      return instance;
    }
    __name(createInstance, "createInstance");
    var axios = createInstance(defaults$1);
    axios.Axios = Axios$1;
    axios.CanceledError = CanceledError$1;
    axios.CancelToken = CancelToken$1;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData;
    axios.AxiosError = AxiosError$1;
    axios.Cancel = axios.CanceledError;
    axios.all = /* @__PURE__ */ __name(function all(promises) {
      return Promise.all(promises);
    }, "all");
    axios.spread = spread;
    axios.isAxiosError = isAxiosError;
    axios.mergeConfig = mergeConfig;
    axios.AxiosHeaders = AxiosHeaders$1;
    axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
    axios.getAdapter = adapters.getAdapter;
    axios.HttpStatusCode = HttpStatusCode$1;
    axios.default = axios;
    module.exports = axios;
  }
});

// node_modules/is-electron/index.js
var require_is_electron = __commonJS({
  "node_modules/is-electron/index.js"(exports, module) {
    init_esm();
    function isElectron() {
      if (typeof window !== "undefined" && typeof window.process === "object" && window.process.type === "renderer") {
        return true;
      }
      if (typeof process !== "undefined" && typeof process.versions === "object" && !!process.versions.electron) {
        return true;
      }
      if (typeof navigator === "object" && typeof navigator.userAgent === "string" && navigator.userAgent.indexOf("Electron") >= 0) {
        return true;
      }
      return false;
    }
    __name(isElectron, "isElectron");
    module.exports = isElectron;
  }
});

// node_modules/@slack/web-api/node_modules/is-stream/index.js
var require_is_stream = __commonJS({
  "node_modules/@slack/web-api/node_modules/is-stream/index.js"(exports, module) {
    "use strict";
    init_esm();
    var isStream = /* @__PURE__ */ __name((stream) => stream !== null && typeof stream === "object" && typeof stream.pipe === "function", "isStream");
    isStream.writable = (stream) => isStream(stream) && stream.writable !== false && typeof stream._write === "function" && typeof stream._writableState === "object";
    isStream.readable = (stream) => isStream(stream) && stream.readable !== false && typeof stream._read === "function" && typeof stream._readableState === "object";
    isStream.duplex = (stream) => isStream.writable(stream) && isStream.readable(stream);
    isStream.transform = (stream) => isStream.duplex(stream) && typeof stream._transform === "function";
    module.exports = isStream;
  }
});

// node_modules/p-queue/node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "node_modules/p-queue/node_modules/eventemitter3/index.js"(exports, module) {
    "use strict";
    init_esm();
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    __name(Events, "Events");
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    __name(EE, "EE");
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    __name(addListener, "addListener");
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    __name(clearEvent, "clearEvent");
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    __name(EventEmitter, "EventEmitter");
    EventEmitter.prototype.eventNames = /* @__PURE__ */ __name(function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    }, "eventNames");
    EventEmitter.prototype.listeners = /* @__PURE__ */ __name(function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    }, "listeners");
    EventEmitter.prototype.listenerCount = /* @__PURE__ */ __name(function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    }, "listenerCount");
    EventEmitter.prototype.emit = /* @__PURE__ */ __name(function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    }, "emit");
    EventEmitter.prototype.on = /* @__PURE__ */ __name(function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    }, "on");
    EventEmitter.prototype.once = /* @__PURE__ */ __name(function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    }, "once");
    EventEmitter.prototype.removeListener = /* @__PURE__ */ __name(function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    }, "removeListener");
    EventEmitter.prototype.removeAllListeners = /* @__PURE__ */ __name(function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    }, "removeAllListeners");
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prefixed = prefix;
    EventEmitter.EventEmitter = EventEmitter;
    if ("undefined" !== typeof module) {
      module.exports = EventEmitter;
    }
  }
});

// node_modules/p-finally/index.js
var require_p_finally = __commonJS({
  "node_modules/p-finally/index.js"(exports, module) {
    "use strict";
    init_esm();
    module.exports = (promise, onFinally) => {
      onFinally = onFinally || (() => {
      });
      return promise.then(
        (val) => new Promise((resolve) => {
          resolve(onFinally());
        }).then(() => val),
        (err) => new Promise((resolve) => {
          resolve(onFinally());
        }).then(() => {
          throw err;
        })
      );
    };
  }
});

// node_modules/p-timeout/index.js
var require_p_timeout = __commonJS({
  "node_modules/p-timeout/index.js"(exports, module) {
    "use strict";
    init_esm();
    var pFinally = require_p_finally();
    var TimeoutError = class extends Error {
      static {
        __name(this, "TimeoutError");
      }
      constructor(message) {
        super(message);
        this.name = "TimeoutError";
      }
    };
    var pTimeout = /* @__PURE__ */ __name((promise, milliseconds, fallback) => new Promise((resolve, reject) => {
      if (typeof milliseconds !== "number" || milliseconds < 0) {
        throw new TypeError("Expected `milliseconds` to be a positive number");
      }
      if (milliseconds === Infinity) {
        resolve(promise);
        return;
      }
      const timer = setTimeout(() => {
        if (typeof fallback === "function") {
          try {
            resolve(fallback());
          } catch (error) {
            reject(error);
          }
          return;
        }
        const message = typeof fallback === "string" ? fallback : `Promise timed out after ${milliseconds} milliseconds`;
        const timeoutError = fallback instanceof Error ? fallback : new TimeoutError(message);
        if (typeof promise.cancel === "function") {
          promise.cancel();
        }
        reject(timeoutError);
      }, milliseconds);
      pFinally(
        // eslint-disable-next-line promise/prefer-await-to-then
        promise.then(resolve, reject),
        () => {
          clearTimeout(timer);
        }
      );
    }), "pTimeout");
    module.exports = pTimeout;
    module.exports.default = pTimeout;
    module.exports.TimeoutError = TimeoutError;
  }
});

// node_modules/p-queue/dist/lower-bound.js
var require_lower_bound = __commonJS({
  "node_modules/p-queue/dist/lower-bound.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    function lowerBound(array, value, comparator) {
      let first = 0;
      let count = array.length;
      while (count > 0) {
        const step = count / 2 | 0;
        let it = first + step;
        if (comparator(array[it], value) <= 0) {
          first = ++it;
          count -= step + 1;
        } else {
          count = step;
        }
      }
      return first;
    }
    __name(lowerBound, "lowerBound");
    exports.default = lowerBound;
  }
});

// node_modules/p-queue/dist/priority-queue.js
var require_priority_queue = __commonJS({
  "node_modules/p-queue/dist/priority-queue.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var lower_bound_1 = require_lower_bound();
    var PriorityQueue = class {
      static {
        __name(this, "PriorityQueue");
      }
      constructor() {
        this._queue = [];
      }
      enqueue(run, options) {
        options = Object.assign({ priority: 0 }, options);
        const element = {
          priority: options.priority,
          run
        };
        if (this.size && this._queue[this.size - 1].priority >= options.priority) {
          this._queue.push(element);
          return;
        }
        const index = lower_bound_1.default(this._queue, element, (a, b) => b.priority - a.priority);
        this._queue.splice(index, 0, element);
      }
      dequeue() {
        const item = this._queue.shift();
        return item === null || item === void 0 ? void 0 : item.run;
      }
      filter(options) {
        return this._queue.filter((element) => element.priority === options.priority).map((element) => element.run);
      }
      get size() {
        return this._queue.length;
      }
    };
    exports.default = PriorityQueue;
  }
});

// node_modules/p-queue/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/p-queue/dist/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var EventEmitter = require_eventemitter3();
    var p_timeout_1 = require_p_timeout();
    var priority_queue_1 = require_priority_queue();
    var empty = /* @__PURE__ */ __name(() => {
    }, "empty");
    var timeoutError = new p_timeout_1.TimeoutError();
    var PQueue = class extends EventEmitter {
      static {
        __name(this, "PQueue");
      }
      constructor(options) {
        var _a, _b, _c, _d;
        super();
        this._intervalCount = 0;
        this._intervalEnd = 0;
        this._pendingCount = 0;
        this._resolveEmpty = empty;
        this._resolveIdle = empty;
        options = Object.assign({ carryoverConcurrencyCount: false, intervalCap: Infinity, interval: 0, concurrency: Infinity, autoStart: true, queueClass: priority_queue_1.default }, options);
        if (!(typeof options.intervalCap === "number" && options.intervalCap >= 1)) {
          throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${(_b = (_a = options.intervalCap) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : ""}\` (${typeof options.intervalCap})`);
        }
        if (options.interval === void 0 || !(Number.isFinite(options.interval) && options.interval >= 0)) {
          throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${(_d = (_c = options.interval) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""}\` (${typeof options.interval})`);
        }
        this._carryoverConcurrencyCount = options.carryoverConcurrencyCount;
        this._isIntervalIgnored = options.intervalCap === Infinity || options.interval === 0;
        this._intervalCap = options.intervalCap;
        this._interval = options.interval;
        this._queue = new options.queueClass();
        this._queueClass = options.queueClass;
        this.concurrency = options.concurrency;
        this._timeout = options.timeout;
        this._throwOnTimeout = options.throwOnTimeout === true;
        this._isPaused = options.autoStart === false;
      }
      get _doesIntervalAllowAnother() {
        return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
      }
      get _doesConcurrentAllowAnother() {
        return this._pendingCount < this._concurrency;
      }
      _next() {
        this._pendingCount--;
        this._tryToStartAnother();
        this.emit("next");
      }
      _resolvePromises() {
        this._resolveEmpty();
        this._resolveEmpty = empty;
        if (this._pendingCount === 0) {
          this._resolveIdle();
          this._resolveIdle = empty;
          this.emit("idle");
        }
      }
      _onResumeInterval() {
        this._onInterval();
        this._initializeIntervalIfNeeded();
        this._timeoutId = void 0;
      }
      _isIntervalPaused() {
        const now = Date.now();
        if (this._intervalId === void 0) {
          const delay = this._intervalEnd - now;
          if (delay < 0) {
            this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
          } else {
            if (this._timeoutId === void 0) {
              this._timeoutId = setTimeout(() => {
                this._onResumeInterval();
              }, delay);
            }
            return true;
          }
        }
        return false;
      }
      _tryToStartAnother() {
        if (this._queue.size === 0) {
          if (this._intervalId) {
            clearInterval(this._intervalId);
          }
          this._intervalId = void 0;
          this._resolvePromises();
          return false;
        }
        if (!this._isPaused) {
          const canInitializeInterval = !this._isIntervalPaused();
          if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
            const job = this._queue.dequeue();
            if (!job) {
              return false;
            }
            this.emit("active");
            job();
            if (canInitializeInterval) {
              this._initializeIntervalIfNeeded();
            }
            return true;
          }
        }
        return false;
      }
      _initializeIntervalIfNeeded() {
        if (this._isIntervalIgnored || this._intervalId !== void 0) {
          return;
        }
        this._intervalId = setInterval(() => {
          this._onInterval();
        }, this._interval);
        this._intervalEnd = Date.now() + this._interval;
      }
      _onInterval() {
        if (this._intervalCount === 0 && this._pendingCount === 0 && this._intervalId) {
          clearInterval(this._intervalId);
          this._intervalId = void 0;
        }
        this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
        this._processQueue();
      }
      /**
      Executes all queued functions until it reaches the limit.
      */
      _processQueue() {
        while (this._tryToStartAnother()) {
        }
      }
      get concurrency() {
        return this._concurrency;
      }
      set concurrency(newConcurrency) {
        if (!(typeof newConcurrency === "number" && newConcurrency >= 1)) {
          throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
        }
        this._concurrency = newConcurrency;
        this._processQueue();
      }
      /**
      Adds a sync or async task to the queue. Always returns a promise.
      */
      async add(fn, options = {}) {
        return new Promise((resolve, reject) => {
          const run = /* @__PURE__ */ __name(async () => {
            this._pendingCount++;
            this._intervalCount++;
            try {
              const operation = this._timeout === void 0 && options.timeout === void 0 ? fn() : p_timeout_1.default(Promise.resolve(fn()), options.timeout === void 0 ? this._timeout : options.timeout, () => {
                if (options.throwOnTimeout === void 0 ? this._throwOnTimeout : options.throwOnTimeout) {
                  reject(timeoutError);
                }
                return void 0;
              });
              resolve(await operation);
            } catch (error) {
              reject(error);
            }
            this._next();
          }, "run");
          this._queue.enqueue(run, options);
          this._tryToStartAnother();
          this.emit("add");
        });
      }
      /**
          Same as `.add()`, but accepts an array of sync or async functions.
      
          @returns A promise that resolves when all functions are resolved.
          */
      async addAll(functions, options) {
        return Promise.all(functions.map(async (function_) => this.add(function_, options)));
      }
      /**
      Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
      */
      start() {
        if (!this._isPaused) {
          return this;
        }
        this._isPaused = false;
        this._processQueue();
        return this;
      }
      /**
      Put queue execution on hold.
      */
      pause() {
        this._isPaused = true;
      }
      /**
      Clear the queue.
      */
      clear() {
        this._queue = new this._queueClass();
      }
      /**
          Can be called multiple times. Useful if you for example add additional items at a later time.
      
          @returns A promise that settles when the queue becomes empty.
          */
      async onEmpty() {
        if (this._queue.size === 0) {
          return;
        }
        return new Promise((resolve) => {
          const existingResolve = this._resolveEmpty;
          this._resolveEmpty = () => {
            existingResolve();
            resolve();
          };
        });
      }
      /**
          The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.
      
          @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
          */
      async onIdle() {
        if (this._pendingCount === 0 && this._queue.size === 0) {
          return;
        }
        return new Promise((resolve) => {
          const existingResolve = this._resolveIdle;
          this._resolveIdle = () => {
            existingResolve();
            resolve();
          };
        });
      }
      /**
      Size of the queue.
      */
      get size() {
        return this._queue.size;
      }
      /**
          Size of the queue, filtered by the given options.
      
          For example, this can be used to find the number of items remaining in the queue with a specific priority level.
          */
      sizeBy(options) {
        return this._queue.filter(options).length;
      }
      /**
      Number of pending promises.
      */
      get pending() {
        return this._pendingCount;
      }
      /**
      Whether the queue is currently paused.
      */
      get isPaused() {
        return this._isPaused;
      }
      get timeout() {
        return this._timeout;
      }
      /**
      Set the timeout for future operations.
      */
      set timeout(milliseconds) {
        this._timeout = milliseconds;
      }
    };
    exports.default = PQueue;
  }
});

// node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "node_modules/retry/lib/retry_operation.js"(exports, module) {
    init_esm();
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      this._timer = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    __name(RetryOperation, "RetryOperation");
    module.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts.slice(0);
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (this._timer) {
        clearTimeout(this._timer);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.push(err);
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(0, this._errors.length - 1);
          timeout = this._cachedTimeouts.slice(-1);
        } else {
          return false;
        }
      }
      var self2 = this;
      this._timer = setTimeout(function() {
        self2._attempts++;
        if (self2._operationTimeoutCb) {
          self2._timeout = setTimeout(function() {
            self2._operationTimeoutCb(self2._attempts);
          }, self2._operationTimeout);
          if (self2._options.unref) {
            self2._timeout.unref();
          }
        }
        self2._fn(self2._attempts);
      }, timeout);
      if (this._options.unref) {
        this._timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self2 = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self2._operationTimeoutCb();
        }, self2._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message = error.message;
        var count = (counts[message] || 0) + 1;
        counts[message] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "node_modules/retry/lib/retry.js"(exports) {
    init_esm();
    var RetryOperation = require_retry_operation();
    exports.operation = function(options) {
      var timeouts = exports.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && (options.forever || options.retries === Infinity),
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = (/* @__PURE__ */ __name(function retryWrapper(original2) {
          var op = exports.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }, "retryWrapper")).bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// node_modules/retry/index.js
var require_retry2 = __commonJS({
  "node_modules/retry/index.js"(exports, module) {
    init_esm();
    module.exports = require_retry();
  }
});

// node_modules/p-retry/index.js
var require_p_retry = __commonJS({
  "node_modules/p-retry/index.js"(exports, module) {
    "use strict";
    init_esm();
    var retry = require_retry2();
    var networkErrorMsgs = [
      "Failed to fetch",
      // Chrome
      "NetworkError when attempting to fetch resource.",
      // Firefox
      "The Internet connection appears to be offline.",
      // Safari
      "Network request failed"
      // `cross-fetch`
    ];
    var AbortError = class extends Error {
      static {
        __name(this, "AbortError");
      }
      constructor(message) {
        super();
        if (message instanceof Error) {
          this.originalError = message;
          ({ message } = message);
        } else {
          this.originalError = new Error(message);
          this.originalError.stack = this.stack;
        }
        this.name = "AbortError";
        this.message = message;
      }
    };
    var decorateErrorWithCounts = /* @__PURE__ */ __name((error, attemptNumber, options) => {
      const retriesLeft = options.retries - (attemptNumber - 1);
      error.attemptNumber = attemptNumber;
      error.retriesLeft = retriesLeft;
      return error;
    }, "decorateErrorWithCounts");
    var isNetworkError = /* @__PURE__ */ __name((errorMessage) => networkErrorMsgs.includes(errorMessage), "isNetworkError");
    var pRetry = /* @__PURE__ */ __name((input, options) => new Promise((resolve, reject) => {
      options = {
        onFailedAttempt: /* @__PURE__ */ __name(() => {
        }, "onFailedAttempt"),
        retries: 10,
        ...options
      };
      const operation = retry.operation(options);
      operation.attempt(async (attemptNumber) => {
        try {
          resolve(await input(attemptNumber));
        } catch (error) {
          if (!(error instanceof Error)) {
            reject(new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`));
            return;
          }
          if (error instanceof AbortError) {
            operation.stop();
            reject(error.originalError);
          } else if (error instanceof TypeError && !isNetworkError(error.message)) {
            operation.stop();
            reject(error);
          } else {
            decorateErrorWithCounts(error, attemptNumber, options);
            try {
              await options.onFailedAttempt(error);
            } catch (error2) {
              reject(error2);
              return;
            }
            if (!operation.retry(error)) {
              reject(operation.mainError());
            }
          }
        }
      });
    }), "pRetry");
    module.exports = pRetry;
    module.exports.default = pRetry;
    module.exports.AbortError = AbortError;
  }
});

// node_modules/@slack/web-api/dist/file-upload.js
var require_file_upload = __commonJS({
  "node_modules/@slack/web-api/dist/file-upload.js"(exports) {
    "use strict";
    init_esm();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getFileUploadJob = getFileUploadJob;
    exports.getMultipleFileUploadJobs = getMultipleFileUploadJobs;
    exports.getFileData = getFileData;
    exports.getFileDataLength = getFileDataLength;
    exports.getFileDataAsStream = getFileDataAsStream;
    exports.getAllFileUploadsToComplete = getAllFileUploadsToComplete;
    exports.warnIfNotUsingFilesUploadV2 = warnIfNotUsingFilesUploadV2;
    exports.warnIfChannels = warnIfChannels;
    exports.errorIfChannelsCsv = errorIfChannelsCsv;
    exports.errorIfInvalidOrMissingFileData = errorIfInvalidOrMissingFileData;
    exports.warnIfMissingOrInvalidFileNameAndDefault = warnIfMissingOrInvalidFileNameAndDefault;
    exports.warnIfLegacyFileType = warnIfLegacyFileType;
    exports.buildMissingFileIdError = buildMissingFileIdError;
    exports.buildFileSizeErrorMsg = buildFileSizeErrorMsg;
    exports.buildLegacyFileTypeWarning = buildLegacyFileTypeWarning;
    exports.buildMissingFileNameWarning = buildMissingFileNameWarning;
    exports.buildMissingExtensionWarning = buildMissingExtensionWarning;
    exports.buildLegacyMethodWarning = buildLegacyMethodWarning;
    exports.buildGeneralFilesUploadWarning = buildGeneralFilesUploadWarning;
    exports.buildFilesUploadMissingMessage = buildFilesUploadMissingMessage;
    exports.buildChannelsWarning = buildChannelsWarning;
    exports.buildMultipleChannelsErrorMsg = buildMultipleChannelsErrorMsg;
    exports.buildInvalidFilesUploadParamError = buildInvalidFilesUploadParamError;
    var node_fs_1 = __require("node:fs");
    var node_stream_1 = __require("node:stream");
    var errors_1 = require_errors();
    function getFileUploadJob(options, logger) {
      return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        warnIfLegacyFileType(options, logger);
        warnIfChannels(options, logger);
        errorIfChannelsCsv(options);
        const fileName = warnIfMissingOrInvalidFileNameAndDefault(options, logger);
        const fileData = yield getFileData(options);
        const fileDataBytesLength = getFileDataLength(fileData);
        const fileUploadJob = {
          // supplied by user
          alt_text: options.alt_text,
          blocks: options.blocks,
          channel_id: (_a = options.channels) !== null && _a !== void 0 ? _a : options.channel_id,
          filename: (_b = options.filename) !== null && _b !== void 0 ? _b : fileName,
          initial_comment: options.initial_comment,
          snippet_type: options.snippet_type,
          title: (_d = (_c = options.title) !== null && _c !== void 0 ? _c : options.filename) !== null && _d !== void 0 ? _d : fileName,
          // default title to filename unless otherwise specified
          // calculated
          data: fileData,
          length: fileDataBytesLength
        };
        if ("thread_ts" in options) {
          fileUploadJob.thread_ts = options.thread_ts;
        }
        if ("token" in options) {
          fileUploadJob.token = options.token;
        }
        if ("content" in options) {
          return Object.assign({ content: options.content }, fileUploadJob);
        }
        if ("file" in options) {
          return Object.assign({ file: options.file }, fileUploadJob);
        }
        throw (0, errors_1.errorWithCode)(new Error("Either a file or content field is required for valid file upload. You must supply one"), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
      });
    }
    __name(getFileUploadJob, "getFileUploadJob");
    function getMultipleFileUploadJobs(options, logger) {
      return __awaiter(this, void 0, void 0, function* () {
        if ("file_uploads" in options) {
          return Promise.all(options.file_uploads.map((upload) => {
            const { blocks, channel_id, channels, initial_comment, thread_ts } = upload;
            if (blocks || channel_id || channels || initial_comment || thread_ts) {
              throw (0, errors_1.errorWithCode)(new Error(buildInvalidFilesUploadParamError()), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
            }
            const uploadJobArgs = Object.assign(Object.assign({}, upload), { blocks: options.blocks, channels: options.channels, channel_id: options.channel_id, initial_comment: options.initial_comment });
            if ("thread_ts" in options) {
              uploadJobArgs.thread_ts = options.thread_ts;
            }
            if ("token" in options) {
              uploadJobArgs.token = options.token;
            }
            if ("content" in upload) {
              return getFileUploadJob(Object.assign({ content: upload.content }, uploadJobArgs), logger);
            }
            if ("file" in upload) {
              return getFileUploadJob(Object.assign({ file: upload.file }, uploadJobArgs), logger);
            }
            throw (0, errors_1.errorWithCode)(new Error("Either a file or content field is required for valid file upload. You must supply one"), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
          }));
        }
        throw new Error(buildFilesUploadMissingMessage());
      });
    }
    __name(getMultipleFileUploadJobs, "getMultipleFileUploadJobs");
    function getFileData(options) {
      return __awaiter(this, void 0, void 0, function* () {
        errorIfInvalidOrMissingFileData(options);
        if ("file" in options) {
          const { file } = options;
          if (Buffer.isBuffer(file))
            return file;
          if (typeof file === "string") {
            try {
              const dataBuffer = (0, node_fs_1.readFileSync)(file);
              return dataBuffer;
            } catch (_err) {
              throw (0, errors_1.errorWithCode)(new Error(`Unable to resolve file data for ${file}. Please supply a filepath string, or binary data Buffer or String directly.`), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
            }
          }
          const data = yield getFileDataAsStream(file);
          if (data)
            return data;
        }
        if ("content" in options)
          return Buffer.from(options.content);
        throw (0, errors_1.errorWithCode)(new Error("There was an issue getting the file data for the file or content supplied"), errors_1.ErrorCode.FileUploadReadFileDataError);
      });
    }
    __name(getFileData, "getFileData");
    function getFileDataLength(data) {
      if (data) {
        return Buffer.byteLength(data, "utf8");
      }
      throw (0, errors_1.errorWithCode)(new Error(buildFileSizeErrorMsg()), errors_1.ErrorCode.FileUploadReadFileDataError);
    }
    __name(getFileDataLength, "getFileDataLength");
    function getFileDataAsStream(readable) {
      return __awaiter(this, void 0, void 0, function* () {
        const chunks = [];
        return new Promise((resolve, reject) => {
          readable.on("readable", () => {
            let chunk = readable.read();
            while (chunk !== null) {
              chunks.push(chunk);
              chunk = readable.read();
            }
          });
          readable.on("end", () => {
            if (chunks.length > 0) {
              const content = Buffer.concat(chunks);
              resolve(content);
            } else {
              reject(Error("No data in supplied file"));
            }
          });
        });
      });
    }
    __name(getFileDataAsStream, "getFileDataAsStream");
    function getAllFileUploadsToComplete(fileUploads) {
      const toComplete = {};
      for (const upload of fileUploads) {
        const { blocks, channel_id, thread_ts, initial_comment, file_id, title } = upload;
        if (file_id) {
          const compareString = `:::${channel_id}:::${thread_ts}:::${initial_comment}:::${JSON.stringify(blocks)}`;
          if (!Object.prototype.hasOwnProperty.call(toComplete, compareString)) {
            toComplete[compareString] = {
              files: [{ id: file_id, title }],
              channel_id,
              blocks,
              initial_comment
            };
            if (thread_ts && channel_id) {
              const fileThreadDestinationArgument = {
                channel_id,
                thread_ts
              };
              toComplete[compareString] = Object.assign(Object.assign({}, toComplete[compareString]), fileThreadDestinationArgument);
            }
            if ("token" in upload) {
              toComplete[compareString].token = upload.token;
            }
          } else {
            toComplete[compareString].files.push({
              id: file_id,
              title
            });
          }
        } else {
          throw new Error(buildMissingFileIdError());
        }
      }
      return toComplete;
    }
    __name(getAllFileUploadsToComplete, "getAllFileUploadsToComplete");
    function warnIfNotUsingFilesUploadV2(method, logger) {
      const targetMethods = ["files.upload"];
      const isTargetMethod = targetMethods.includes(method);
      if (method === "files.upload")
        logger.warn(buildLegacyMethodWarning(method));
      if (isTargetMethod)
        logger.info(buildGeneralFilesUploadWarning());
    }
    __name(warnIfNotUsingFilesUploadV2, "warnIfNotUsingFilesUploadV2");
    function warnIfChannels(options, logger) {
      if (options.channels)
        logger.warn(buildChannelsWarning());
    }
    __name(warnIfChannels, "warnIfChannels");
    function errorIfChannelsCsv(options) {
      const channels = options.channels ? options.channels.split(",") : [];
      if (channels.length > 1) {
        throw (0, errors_1.errorWithCode)(new Error(buildMultipleChannelsErrorMsg()), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
      }
    }
    __name(errorIfChannelsCsv, "errorIfChannelsCsv");
    function errorIfInvalidOrMissingFileData(options) {
      const hasFile = "file" in options;
      const hasContent = "content" in options;
      if (!(hasFile || hasContent) || hasFile && hasContent) {
        throw (0, errors_1.errorWithCode)(new Error("Either a file or content field is required for valid file upload. You cannot supply both"), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
      }
      if ("file" in options) {
        const { file } = options;
        if (file && !(typeof file === "string" || Buffer.isBuffer(file) || file instanceof node_stream_1.Readable)) {
          throw (0, errors_1.errorWithCode)(new Error("file must be a valid string path, buffer or Readable"), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
        }
      }
      if ("content" in options && options.content && typeof options.content !== "string") {
        throw (0, errors_1.errorWithCode)(new Error("content must be a string"), errors_1.ErrorCode.FileUploadInvalidArgumentsError);
      }
    }
    __name(errorIfInvalidOrMissingFileData, "errorIfInvalidOrMissingFileData");
    function warnIfMissingOrInvalidFileNameAndDefault(options, logger) {
      var _a;
      const DEFAULT_FILETYPE = "txt";
      const DEFAULT_FILENAME = `file.${(_a = options.filetype) !== null && _a !== void 0 ? _a : DEFAULT_FILETYPE}`;
      const { filename } = options;
      if (!filename) {
        logger.warn(buildMissingFileNameWarning());
        return DEFAULT_FILENAME;
      }
      if (filename.split(".").length < 2) {
        logger.warn(buildMissingExtensionWarning(filename));
      }
      return filename;
    }
    __name(warnIfMissingOrInvalidFileNameAndDefault, "warnIfMissingOrInvalidFileNameAndDefault");
    function warnIfLegacyFileType(options, logger) {
      if (options.filetype) {
        logger.warn(buildLegacyFileTypeWarning());
      }
    }
    __name(warnIfLegacyFileType, "warnIfLegacyFileType");
    function buildMissingFileIdError() {
      return "Missing required file id for file upload completion";
    }
    __name(buildMissingFileIdError, "buildMissingFileIdError");
    function buildFileSizeErrorMsg() {
      return "There was an issue calculating the size of your file";
    }
    __name(buildFileSizeErrorMsg, "buildFileSizeErrorMsg");
    function buildLegacyFileTypeWarning() {
      return "filetype is no longer a supported field in files.uploadV2. \nPlease remove this field. To indicate file type, please do so via the required filename property using the appropriate file extension, e.g. image.png, text.txt";
    }
    __name(buildLegacyFileTypeWarning, "buildLegacyFileTypeWarning");
    function buildMissingFileNameWarning() {
      return "filename is a required field for files.uploadV2. \n For backwards compatibility and ease of migration, defaulting the filename. For best experience and consistent unfurl behavior, you should set the filename property with correct file extension, e.g. image.png, text.txt";
    }
    __name(buildMissingFileNameWarning, "buildMissingFileNameWarning");
    function buildMissingExtensionWarning(filename) {
      return `filename supplied '${filename}' may be missing a proper extension. Missing extenions may result in unexpected unfurl behavior when shared`;
    }
    __name(buildMissingExtensionWarning, "buildMissingExtensionWarning");
    function buildLegacyMethodWarning(method) {
      return `${method} may cause some issues like timeouts for relatively large files.`;
    }
    __name(buildLegacyMethodWarning, "buildLegacyMethodWarning");
    function buildGeneralFilesUploadWarning() {
      return "Our latest recommendation is to use client.files.uploadV2() method, which is mostly compatible and much stabler, instead.";
    }
    __name(buildGeneralFilesUploadWarning, "buildGeneralFilesUploadWarning");
    function buildFilesUploadMissingMessage() {
      return "Something went wrong with processing file_uploads";
    }
    __name(buildFilesUploadMissingMessage, "buildFilesUploadMissingMessage");
    function buildChannelsWarning() {
      return "Although the 'channels' parameter is still supported for smoother migration from legacy files.upload, we recommend using the new channel_id parameter with a single str value instead (e.g. 'C12345').";
    }
    __name(buildChannelsWarning, "buildChannelsWarning");
    function buildMultipleChannelsErrorMsg() {
      return "Sharing files with multiple channels is no longer supported in v2. Share files in each channel separately instead.";
    }
    __name(buildMultipleChannelsErrorMsg, "buildMultipleChannelsErrorMsg");
    function buildInvalidFilesUploadParamError() {
      return "You may supply file_uploads only for a single channel, message, or thread respectively. Therefore, please supply any channel_id, initial_comment or blocks, or thread_ts in the top-layer.";
    }
    __name(buildInvalidFilesUploadParamError, "buildInvalidFilesUploadParamError");
  }
});

// node_modules/@slack/web-api/dist/helpers.js
var require_helpers = __commonJS({
  "node_modules/@slack/web-api/dist/helpers.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = delay;
    function delay(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }
    __name(delay, "delay");
  }
});

// node_modules/eventemitter3/index.js
var require_eventemitter32 = __commonJS({
  "node_modules/eventemitter3/index.js"(exports, module) {
    "use strict";
    init_esm();
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    __name(Events, "Events");
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    __name(EE, "EE");
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    __name(addListener, "addListener");
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    __name(clearEvent, "clearEvent");
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    __name(EventEmitter, "EventEmitter");
    EventEmitter.prototype.eventNames = /* @__PURE__ */ __name(function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    }, "eventNames");
    EventEmitter.prototype.listeners = /* @__PURE__ */ __name(function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    }, "listeners");
    EventEmitter.prototype.listenerCount = /* @__PURE__ */ __name(function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    }, "listenerCount");
    EventEmitter.prototype.emit = /* @__PURE__ */ __name(function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    }, "emit");
    EventEmitter.prototype.on = /* @__PURE__ */ __name(function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    }, "on");
    EventEmitter.prototype.once = /* @__PURE__ */ __name(function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    }, "once");
    EventEmitter.prototype.removeListener = /* @__PURE__ */ __name(function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    }, "removeListener");
    EventEmitter.prototype.removeAllListeners = /* @__PURE__ */ __name(function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    }, "removeAllListeners");
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prefixed = prefix;
    EventEmitter.EventEmitter = EventEmitter;
    if ("undefined" !== typeof module) {
      module.exports = EventEmitter;
    }
  }
});

// node_modules/@slack/types/dist/block-kit/block-elements.js
var require_block_elements = __commonJS({
  "node_modules/@slack/types/dist/block-kit/block-elements.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/block-kit/blocks.js
var require_blocks = __commonJS({
  "node_modules/@slack/types/dist/block-kit/blocks.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/block-kit/composition-objects.js
var require_composition_objects = __commonJS({
  "node_modules/@slack/types/dist/block-kit/composition-objects.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/block-kit/extensions.js
var require_extensions = __commonJS({
  "node_modules/@slack/types/dist/block-kit/extensions.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/calls.js
var require_calls = __commonJS({
  "node_modules/@slack/types/dist/calls.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/chunk.js
var require_chunk = __commonJS({
  "node_modules/@slack/types/dist/chunk.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/dialog.js
var require_dialog = __commonJS({
  "node_modules/@slack/types/dist/dialog.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/app.js
var require_app = __commonJS({
  "node_modules/@slack/types/dist/events/app.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/assistant.js
var require_assistant = __commonJS({
  "node_modules/@slack/types/dist/events/assistant.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/call.js
var require_call = __commonJS({
  "node_modules/@slack/types/dist/events/call.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/channel.js
var require_channel = __commonJS({
  "node_modules/@slack/types/dist/events/channel.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/dnd.js
var require_dnd = __commonJS({
  "node_modules/@slack/types/dist/events/dnd.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/email.js
var require_email = __commonJS({
  "node_modules/@slack/types/dist/events/email.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/emoji.js
var require_emoji = __commonJS({
  "node_modules/@slack/types/dist/events/emoji.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/file.js
var require_file = __commonJS({
  "node_modules/@slack/types/dist/events/file.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/function.js
var require_function = __commonJS({
  "node_modules/@slack/types/dist/events/function.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/grid-migration.js
var require_grid_migration = __commonJS({
  "node_modules/@slack/types/dist/events/grid-migration.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/group.js
var require_group = __commonJS({
  "node_modules/@slack/types/dist/events/group.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/im.js
var require_im = __commonJS({
  "node_modules/@slack/types/dist/events/im.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/invite.js
var require_invite = __commonJS({
  "node_modules/@slack/types/dist/events/invite.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/link-shared.js
var require_link_shared = __commonJS({
  "node_modules/@slack/types/dist/events/link-shared.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/member.js
var require_member = __commonJS({
  "node_modules/@slack/types/dist/events/member.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/message.js
var require_message = __commonJS({
  "node_modules/@slack/types/dist/events/message.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/message-metadata.js
var require_message_metadata = __commonJS({
  "node_modules/@slack/types/dist/events/message-metadata.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/pin.js
var require_pin = __commonJS({
  "node_modules/@slack/types/dist/events/pin.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/reaction.js
var require_reaction = __commonJS({
  "node_modules/@slack/types/dist/events/reaction.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/shared-channel.js
var require_shared_channel = __commonJS({
  "node_modules/@slack/types/dist/events/shared-channel.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/star.js
var require_star = __commonJS({
  "node_modules/@slack/types/dist/events/star.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/steps-from-apps.js
var require_steps_from_apps = __commonJS({
  "node_modules/@slack/types/dist/events/steps-from-apps.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/subteam.js
var require_subteam = __commonJS({
  "node_modules/@slack/types/dist/events/subteam.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/team.js
var require_team = __commonJS({
  "node_modules/@slack/types/dist/events/team.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/token.js
var require_token = __commonJS({
  "node_modules/@slack/types/dist/events/token.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/user.js
var require_user = __commonJS({
  "node_modules/@slack/types/dist/events/user.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/events/index.js
var require_events = __commonJS({
  "node_modules/@slack/types/dist/events/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_app(), exports);
    __exportStar(require_assistant(), exports);
    __exportStar(require_call(), exports);
    __exportStar(require_channel(), exports);
    __exportStar(require_dnd(), exports);
    __exportStar(require_email(), exports);
    __exportStar(require_emoji(), exports);
    __exportStar(require_file(), exports);
    __exportStar(require_function(), exports);
    __exportStar(require_grid_migration(), exports);
    __exportStar(require_group(), exports);
    __exportStar(require_im(), exports);
    __exportStar(require_invite(), exports);
    __exportStar(require_link_shared(), exports);
    __exportStar(require_member(), exports);
    __exportStar(require_message(), exports);
    __exportStar(require_message_metadata(), exports);
    __exportStar(require_pin(), exports);
    __exportStar(require_reaction(), exports);
    __exportStar(require_shared_channel(), exports);
    __exportStar(require_star(), exports);
    __exportStar(require_steps_from_apps(), exports);
    __exportStar(require_subteam(), exports);
    __exportStar(require_team(), exports);
    __exportStar(require_token(), exports);
    __exportStar(require_user(), exports);
  }
});

// node_modules/@slack/types/dist/message-attachments.js
var require_message_attachments = __commonJS({
  "node_modules/@slack/types/dist/message-attachments.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/message-metadata.js
var require_message_metadata2 = __commonJS({
  "node_modules/@slack/types/dist/message-metadata.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CustomFieldType = exports.EntityType = void 0;
    var EntityType;
    (function(EntityType2) {
      EntityType2["Task"] = "slack#/entities/task";
      EntityType2["File"] = "slack#/entities/file";
      EntityType2["Item"] = "slack#/entities/item";
      EntityType2["Incident"] = "slack#/entities/incident";
      EntityType2["ContentItem"] = "slack#/entities/content_item";
    })(EntityType || (exports.EntityType = EntityType = {}));
    var CustomFieldType;
    (function(CustomFieldType2) {
      CustomFieldType2["Integer"] = "integer";
      CustomFieldType2["String"] = "string";
      CustomFieldType2["Array"] = "array";
      CustomFieldType2["Date"] = "slack#/types/date";
      CustomFieldType2["Timestamp"] = "slack#/types/timestamp";
      CustomFieldType2["Image"] = "slack#/types/image";
      CustomFieldType2["ChannelId"] = "slack#/types/channel_id";
      CustomFieldType2["User"] = "slack#/types/user";
      CustomFieldType2["EntityRef"] = "slack#/types/entity_ref";
      CustomFieldType2["Boolean"] = "boolean";
      CustomFieldType2["Link"] = "slack#/types/link";
      CustomFieldType2["Email"] = "slack#/types/email";
    })(CustomFieldType || (exports.CustomFieldType = CustomFieldType = {}));
  }
});

// node_modules/@slack/types/dist/views.js
var require_views = __commonJS({
  "node_modules/@slack/types/dist/views.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@slack/types/dist/index.js
var require_dist3 = __commonJS({
  "node_modules/@slack/types/dist/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_block_elements(), exports);
    __exportStar(require_blocks(), exports);
    __exportStar(require_composition_objects(), exports);
    __exportStar(require_extensions(), exports);
    __exportStar(require_calls(), exports);
    __exportStar(require_chunk(), exports);
    __exportStar(require_dialog(), exports);
    __exportStar(require_events(), exports);
    __exportStar(require_message_attachments(), exports);
    __exportStar(require_message_metadata2(), exports);
    __exportStar(require_views(), exports);
  }
});

// node_modules/@slack/web-api/dist/methods.js
var require_methods = __commonJS({
  "node_modules/@slack/web-api/dist/methods.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Methods = void 0;
    var eventemitter3_1 = require_eventemitter32();
    var WebClient_1 = require_WebClient();
    function bindApiCall(self2, method) {
      const apiMethod = self2.apiCall.bind(self2, method);
      return apiMethod;
    }
    __name(bindApiCall, "bindApiCall");
    function bindApiCallWithOptionalArgument(self2, method) {
      const apiMethod = self2.apiCall.bind(self2, method);
      return apiMethod;
    }
    __name(bindApiCallWithOptionalArgument, "bindApiCallWithOptionalArgument");
    function bindFilesUploadV2(self2) {
      return self2.filesUploadV2.bind(self2);
    }
    __name(bindFilesUploadV2, "bindFilesUploadV2");
    var Methods = class extends eventemitter3_1.EventEmitter {
      static {
        __name(this, "Methods");
      }
      constructor() {
        super();
        this.admin = {
          analytics: {
            /**
             * @description Retrieve analytics data for a given date, presented as a compressed JSON file.
             * @see {@link https://docs.slack.dev/reference/methods/api.test `api.test` API reference}.
             */
            getFile: bindApiCall(this, "admin.analytics.getFile")
          },
          apps: {
            activities: {
              /**
               * @description Get logs for a specified team/org.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.activities.list `admin.apps.activities.list` API reference}.
               */
              list: bindApiCallWithOptionalArgument(this, "admin.apps.activities.list")
            },
            /**
             * @description Approve an app for installation on a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.apps.approve `admin.apps.approve` API reference}.
             */
            approve: bindApiCall(this, "admin.apps.approve"),
            approved: {
              /**
               * @description List approved apps for an org or workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.approved.list `admin.apps.approved.list` API reference}.
               */
              list: bindApiCall(this, "admin.apps.approved.list")
            },
            /**
             * @description Clear an app resolution.
             * @see {@link https://docs.slack.dev/reference/methods/admin.apps.clearResolution `admin.apps.clearResolution` API reference}.
             */
            clearResolution: bindApiCall(this, "admin.apps.clearResolution"),
            config: {
              /**
               * @description Look up the app config for connectors by their IDs.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.config.lookup `admin.apps.config.lookup` API reference}.
               */
              lookup: bindApiCall(this, "admin.apps.config.lookup"),
              /**
               * @description Set the app config for a connector.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.config.set `admin.apps.config.set` API reference}.
               */
              set: bindApiCall(this, "admin.apps.config.set")
            },
            requests: {
              /**
               * @description Cancel app request for team.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.requests.cancel `admin.apps.requests.cancel` API reference}.
               */
              cancel: bindApiCall(this, "admin.apps.requests.cancel"),
              /**
               * @description List app requests for a team/workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.requests.list `admin.apps.requests.list` API reference}.
               */
              list: bindApiCall(this, "admin.apps.requests.list")
            },
            /**
             * @description Restrict an app for installation on a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.apps.restrict `admin.apps.restrict` API reference}.
             */
            restrict: bindApiCall(this, "admin.apps.restrict"),
            restricted: {
              /**
               * @description List restricted apps for an org or workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.apps.restricted.list `admin.apps.restricted.list` API reference}.
               */
              list: bindApiCall(this, "admin.apps.restricted.list")
            },
            /**
             * @description Uninstall an app from one or many workspaces, or an entire enterprise organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.apps.uninstall `admin.apps.uninstall` API reference}.
             */
            uninstall: bindApiCall(this, "admin.apps.uninstall")
          },
          auth: {
            policy: {
              /**
               * @description Assign entities to a particular authentication policy.
               * @see {@link https://docs.slack.dev/reference/methods/admin.auth.policy.assignEntities `admin.auth.policy.assignEntities` API reference}.
               */
              assignEntities: bindApiCall(this, "admin.auth.policy.assignEntities"),
              /**
               * @description Fetch all the entities assigned to a particular authentication policy by name.
               * @see {@link https://docs.slack.dev/reference/methods/admin.auth.policy.getEntities `admin.auth.policy.getEntities` API reference}.
               */
              getEntities: bindApiCall(this, "admin.auth.policy.getEntities"),
              /**
               * @description Remove specified entities from a specified authentication policy.
               * @see {@link https://docs.slack.dev/reference/methods/admin.auth.policy.removeEntities `admin.auth.policy.removeEntities` API reference}.
               */
              removeEntities: bindApiCall(this, "admin.auth.policy.removeEntities")
            }
          },
          barriers: {
            /**
             * @description Create an Information Barrier.
             * @see {@link https://docs.slack.dev/reference/methods/admin.barriers.create `admin.barriers.create` API reference}.
             */
            create: bindApiCall(this, "admin.barriers.create"),
            /**
             * @description Delete an existing Information Barrier.
             * @see {@link https://docs.slack.dev/reference/methods/admin.barriers.delete `admin.barriers.delete` API reference}.
             */
            delete: bindApiCall(this, "admin.barriers.delete"),
            /**
             * @description Get all Information Barriers for your organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.barriers.list `admin.barriers.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "admin.barriers.list"),
            /**
             * @description Update an existing Information Barrier.
             * @see {@link https://docs.slack.dev/reference/methods/admin.barriers.update `admin.barriers.update` API reference}.
             */
            update: bindApiCall(this, "admin.barriers.update")
          },
          conversations: {
            /**
             * @description Archive a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.archive `admin.conversations.archive` API reference}.
             */
            archive: bindApiCall(this, "admin.conversations.archive"),
            /**
             * @description Archive public or private channels in bulk.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.bulkArchive `admin.conversations.bulkArchive` API reference}.
             */
            bulkArchive: bindApiCall(this, "admin.conversations.bulkArchive"),
            /**
             * @description Delete public or private channels in bulk.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.bulkDelete `admin.conversations.bulkDelete` API reference}.
             */
            bulkDelete: bindApiCall(this, "admin.conversations.bulkDelete"),
            /**
             * @description Move public or private channels in bulk.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.bulkMove `admin.conversations.bulkMove` API reference}.
             */
            bulkMove: bindApiCall(this, "admin.conversations.bulkMove"),
            /**
             * @description Convert a public channel to a private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.convertToPrivate `admin.conversations.convertToPrivate` API reference}.
             */
            convertToPrivate: bindApiCall(this, "admin.conversations.convertToPrivate"),
            /**
             * @description Convert a private channel to a public channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.convertToPublic `admin.conversations.convertToPublic` API reference}.
             */
            convertToPublic: bindApiCall(this, "admin.conversations.convertToPublic"),
            /**
             * @description Create a public or private channel-based conversation.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.create `admin.conversations.create` API reference}.
             */
            create: bindApiCall(this, "admin.conversations.create"),
            /**
             * @description Delete a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.delete `admin.conversations.delete` API reference}.
             */
            delete: bindApiCall(this, "admin.conversations.delete"),
            /**
             * @description Disconnect a connected channel from one or more workspaces.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.disconnectShared `admin.conversations.disconnectShared` API reference}.
             */
            disconnectShared: bindApiCall(this, "admin.conversations.disconnectShared"),
            ekm: {
              /**
               * @description List all disconnected channels — i.e., channels that were once connected to other workspaces
               * and then disconnected — and the corresponding original channel IDs for key revocation with EKM.
               * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.ekm.listOriginalConnectedChannelInfo `admin.conversations.ekm.listOriginalConnectedChannelInfo` API reference}.
               */
              listOriginalConnectedChannelInfo: bindApiCallWithOptionalArgument(this, "admin.conversations.ekm.listOriginalConnectedChannelInfo")
            },
            /**
             * @description Get conversation preferences for a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.getConversationPrefs `admin.conversations.getConversationPrefs` API reference}.
             */
            getConversationPrefs: bindApiCall(this, "admin.conversations.getConversationPrefs"),
            /**
             * @description Get a conversation's retention policy.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.getCustomRetention `admin.conversations.getCustomRetention` API reference}.
             */
            getCustomRetention: bindApiCall(this, "admin.conversations.getCustomRetention"),
            /**
             * @description Get all the workspaces a given public or private channel is connected to within
             * this Enterprise org.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.getTeams `admin.conversations.getTeams` API reference}.
             */
            getTeams: bindApiCall(this, "admin.conversations.getTeams"),
            /**
             * @description Invite a user to a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.invite `admin.conversations.invite` API reference}.
             */
            invite: bindApiCall(this, "admin.conversations.invite"),
            /**
             * @description Returns channels on the given team using the filters.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.lookup `admin.conversations.lookup` API reference}.
             */
            lookup: bindApiCall(this, "admin.conversations.lookup"),
            /**
             * @description Remove a conversation's retention policy.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.removeCustomRetention `admin.conversations.removeCustomRetention` API reference}.
             */
            removeCustomRetention: bindApiCall(this, "admin.conversations.removeCustomRetention"),
            /**
             * @description Rename a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.rename `admin.conversations.rename` API reference}.
             */
            rename: bindApiCall(this, "admin.conversations.rename"),
            restrictAccess: {
              /**
               * @description Add an allowlist of IDP groups for accessing a channel.
               * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.restrictAccess.addGroup `admin.conversations.restrictAccess.addGroup` API reference}.
               */
              addGroup: bindApiCall(this, "admin.conversations.restrictAccess.addGroup"),
              /**
               * @description List all IDP Groups linked to a channel.
               * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.restrictAccess.listGroups `admin.conversations.restrictAccess.listGroups` API reference}.
               */
              listGroups: bindApiCall(this, "admin.conversations.restrictAccess.listGroups"),
              /**
               * @description Remove a linked IDP group linked from a private channel.
               * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.restrictAccess.removeGroup `admin.conversations.restrictAccess.removeGroup` API reference}.
               */
              removeGroup: bindApiCall(this, "admin.conversations.restrictAccess.removeGroup")
            },
            /**
             * @description Search for public or private channels in an Enterprise organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.search `admin.conversations.search` API reference}.
             */
            search: bindApiCallWithOptionalArgument(this, "admin.conversations.search"),
            /**
             * @description Set the posting permissions for a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.setConversationPrefs `admin.conversations.setConversationPrefs` API reference}.
             */
            setConversationPrefs: bindApiCall(this, "admin.conversations.setConversationPrefs"),
            /**
             * @description Set a conversation's retention policy.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.setCustomRetention `admin.conversations.setCustomRetention` API reference}.
             */
            setCustomRetention: bindApiCall(this, "admin.conversations.setCustomRetention"),
            /**
             * @description Set the workspaces in an Enterprise grid org that connect to a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.setTeams `admin.conversations.setTeams` API reference}.
             */
            setTeams: bindApiCall(this, "admin.conversations.setTeams"),
            /**
             * @description Unarchive a public or private channel.
             * @see {@link https://docs.slack.dev/reference/methods/admin.conversations.unarchive `admin.conversations.unarchive` API reference}.
             */
            unarchive: bindApiCall(this, "admin.conversations.unarchive")
          },
          emoji: {
            /**
             * @description Add an emoji.
             * @see {@link https://docs.slack.dev/reference/methods/admin.emoji.add `admin.emoji.add` API reference}.
             */
            add: bindApiCall(this, "admin.emoji.add"),
            /**
             * @description Add an emoji alias.
             * @see {@link https://docs.slack.dev/reference/methods/admin.emoji.addAlias `admin.emoji.addAlias` API reference}.
             */
            addAlias: bindApiCall(this, "admin.emoji.addAlias"),
            /**
             * @description List emoji for an Enterprise Grid organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.emoji.list `admin.emoji.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "admin.emoji.list"),
            /**
             * @description Remove an emoji across an Enterprise Grid organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.emoji.remove `admin.emoji.remove` API reference}.
             */
            remove: bindApiCall(this, "admin.emoji.remove"),
            /**
             * @description Rename an emoji.
             * @see {@link https://docs.slack.dev/reference/methods/admin.emoji.rename `admin.emoji.rename` API reference}.
             */
            rename: bindApiCall(this, "admin.emoji.rename")
          },
          functions: {
            /**
             * @description Look up functions by a set of apps.
             * @see {@link https://docs.slack.dev/reference/methods/admin.functions.list `admin.functions.list` API reference}.
             */
            list: bindApiCall(this, "admin.functions.list"),
            permissions: {
              /**
               * @description Lookup the visibility of multiple Slack functions and include the users if
               * it is limited to particular named entities.
               * @see {@link https://docs.slack.dev/reference/methods/admin.functions.permissions.lookup `admin.functions.permissions.lookup` API reference}.
               */
              lookup: bindApiCall(this, "admin.functions.permissions.lookup"),
              /**
               * @description Set the visibility of a Slack function and define the users or workspaces if
               * it is set to named_entities.
               * @see {@link https://docs.slack.dev/reference/methods/admin.functions.permissions.set `admin.functions.permissions.set` API reference}.
               */
              set: bindApiCall(this, "admin.functions.permissions.set")
            }
          },
          inviteRequests: {
            /**
             * @description Approve a workspace invite request.
             * @see {@link https://docs.slack.dev/reference/methods/admin.inviteRequests.approve `admin.inviteRequests.approve` API reference}.
             */
            approve: bindApiCall(this, "admin.inviteRequests.approve"),
            approved: {
              /**
               * @description List all approved workspace invite requests.
               * @see {@link https://docs.slack.dev/reference/methods/admin.inviteRequests.approved.list `admin.inviteRequests.approved.list` API reference}.
               */
              list: bindApiCall(this, "admin.inviteRequests.approved.list")
            },
            denied: {
              /**
               * @description List all denied workspace invite requests.
               * @see {@link https://docs.slack.dev/reference/methods/admin.inviteRequests.denied.list `admin.inviteRequests.denied.list` API reference}.
               */
              list: bindApiCall(this, "admin.inviteRequests.denied.list")
            },
            /**
             * @description Deny a workspace invite request.
             * @see {@link https://docs.slack.dev/reference/methods/admin.inviteRequests.deny `admin.inviteRequests.deny` API reference}.
             */
            deny: bindApiCall(this, "admin.inviteRequests.deny"),
            /**
             * @description List all pending workspace invite requests.
             * @see {@link https://docs.slack.dev/reference/methods/admin.inviteRequests.list `admin.inviteRequests.list` API reference}.
             */
            list: bindApiCall(this, "admin.inviteRequests.list")
          },
          roles: {
            /**
             * @description Adds members to the specified role with the specified scopes.
             * @see {@link https://docs.slack.dev/reference/methods/admin.roles.addAssignments `admin.roles.addAssignments` API reference}.
             */
            addAssignments: bindApiCall(this, "admin.roles.addAssignments"),
            /**
             * @description Lists assignments for all roles across entities.
             * Options to scope results by any combination of roles or entities.
             * @see {@link https://docs.slack.dev/reference/methods/admin.roles.listAssignments `admin.roles.listAssignments` API reference}.
             */
            listAssignments: bindApiCallWithOptionalArgument(this, "admin.roles.listAssignments"),
            /**
             * @description Removes a set of users from a role for the given scopes and entities.
             * @see {@link https://docs.slack.dev/reference/methods/admin.roles.removeAssignments `admin.roles.removeAssignments` API reference}.
             */
            removeAssignments: bindApiCall(this, "admin.roles.removeAssignments")
          },
          teams: {
            admins: {
              /**
               * @description List all of the admins on a given workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.admins.list `admin.teams.admins.list` API reference}.
               */
              list: bindApiCall(this, "admin.teams.admins.list")
            },
            /**
             * @description Create an Enterprise team.
             * @see {@link https://docs.slack.dev/reference/methods/admin.teams.create `admin.teams.create` API reference}.
             */
            create: bindApiCall(this, "admin.teams.create"),
            /**
             * @description List all teams on an Enterprise organization.
             * @see {@link https://docs.slack.dev/reference/methods/admin.teams.list `admin.teams.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "admin.teams.list"),
            owners: {
              /**
               * @description List all of the owners on a given workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.owners.list `admin.teams.owners.list` API reference}.
               */
              list: bindApiCall(this, "admin.teams.owners.list")
            },
            settings: {
              /**
               * @description Fetch information about settings in a workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.info `admin.teams.settings.info` API reference}.
               */
              info: bindApiCall(this, "admin.teams.settings.info"),
              /**
               * @description Set the default channels of a workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.setDefaultChannels `admin.teams.settings.setDefaultChannels` API reference}.
               */
              setDefaultChannels: bindApiCall(this, "admin.teams.settings.setDefaultChannels"),
              /**
               * @description Set the description of a given workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.setDescription `admin.teams.settings.setDescription` API reference}.
               */
              setDescription: bindApiCall(this, "admin.teams.settings.setDescription"),
              /**
               * @description Set the discoverability of a given workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.setDiscoverability `admin.teams.settings.setDiscoverability` API reference}.
               */
              setDiscoverability: bindApiCall(this, "admin.teams.settings.setDiscoverability"),
              /**
               * @description Sets the icon of a workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.setIcon `admin.teams.settings.setIcon` API reference}.
               */
              setIcon: bindApiCall(this, "admin.teams.settings.setIcon"),
              /**
               * @description Set the name of a given workspace.
               * @see {@link https://docs.slack.dev/reference/methods/admin.teams.settings.setName `admin.teams.settings.setName` API reference}.
               */
              setName: bindApiCall(this, "admin.teams.settings.setName")
            }
          },
          usergroups: {
            /**
             * @description Add up to one hundred default channels to an IDP group.
             * @see {@link https://docs.slack.dev/reference/methods/admin.usergroups.addChannels `admin.teams.usergroups.addChannels` API reference}.
             */
            addChannels: bindApiCall(this, "admin.usergroups.addChannels"),
            /**
             * @description Associate one or more default workspaces with an organization-wide IDP group.
             * @see {@link https://docs.slack.dev/reference/methods/admin.usergroups.addTeams `admin.teams.usergroups.addTeams` API reference}.
             */
            addTeams: bindApiCall(this, "admin.usergroups.addTeams"),
            /**
             * @description List the channels linked to an org-level IDP group (user group).
             * @see {@link https://docs.slack.dev/reference/methods/admin.usergroups.listChannels `admin.teams.usergroups.listChannels` API reference}.
             */
            listChannels: bindApiCall(this, "admin.usergroups.listChannels"),
            /**
             * @description Remove one or more default channels from an org-level IDP group (user group).
             * @see {@link https://docs.slack.dev/reference/methods/admin.usergroups.removeChannels `admin.teams.usergroups.removeChannels` API reference}.
             */
            removeChannels: bindApiCall(this, "admin.usergroups.removeChannels")
          },
          users: {
            /**
             * @description Add an Enterprise user to a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.assign `admin.users.assign` API reference}.
             */
            assign: bindApiCall(this, "admin.users.assign"),
            /**
             * @description Invite a user to a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.invite `admin.users.invite` API reference}.
             */
            invite: bindApiCall(this, "admin.users.invite"),
            /**
             * @description List users on a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.list `admin.users.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "admin.users.list"),
            /**
             * @description Remove a user from a workspace.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.remove `admin.users.remove` API reference}.
             */
            remove: bindApiCall(this, "admin.users.remove"),
            session: {
              /**
               * @description Clear user-specific session settings—the session duration and what happens when the client
               * closes—for a list of users.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.clearSettings `admin.users.session.clearSettings` API reference}.
               */
              clearSettings: bindApiCall(this, "admin.users.session.clearSettings"),
              /**
               * @description Get user-specific session settings—the session duration and what happens when the client
               * closes—given a list of users.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.getSettings `admin.users.session.getSettings` API reference}.
               */
              getSettings: bindApiCall(this, "admin.users.session.getSettings"),
              /**
               * @description Revoke a single session for a user. The user will be forced to login to Slack.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.invalidate `admin.users.session.invalidate` API reference}.
               */
              invalidate: bindApiCall(this, "admin.users.session.invalidate"),
              /**
               * @description List active user sessions for an organization.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.list `admin.users.session.list` API reference}.
               */
              list: bindApiCallWithOptionalArgument(this, "admin.users.session.list"),
              /**
               * @description Wipes all valid sessions on all devices for a given user.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.reset `admin.users.session.reset` API reference}.
               */
              reset: bindApiCall(this, "admin.users.session.reset"),
              /**
               * @description Enqueues an asynchronous job to wipe all valid sessions on all devices for a given user list.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.resetBulk `admin.users.session.resetBulk` API reference}.
               */
              resetBulk: bindApiCall(this, "admin.users.session.resetBulk"),
              /**
               * @description Configure the user-level session settings—the session duration and what happens when the client
               * closes—for one or more users.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.session.setSettings `admin.users.session.setSettings` API reference}.
               */
              setSettings: bindApiCall(this, "admin.users.session.setSettings")
            },
            /**
             * @description Set an existing guest, regular user, or owner to be an admin user.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.setAdmin `admin.users.setAdmin` API reference}.
             */
            setAdmin: bindApiCall(this, "admin.users.setAdmin"),
            /**
             * @description Set an expiration for a guest user.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.setExpiration `admin.users.setExpiration` API reference}.
             */
            setExpiration: bindApiCall(this, "admin.users.setExpiration"),
            /**
             * @description Set an existing guest, regular user, or admin user to be a workspace owner.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.setOwner `admin.users.setOwner` API reference}.
             */
            setOwner: bindApiCall(this, "admin.users.setOwner"),
            /**
             * @description Set an existing guest user, admin user, or owner to be a regular user.
             * @see {@link https://docs.slack.dev/reference/methods/admin.users.setRegular `admin.users.setRegular` API reference}.
             */
            setRegular: bindApiCall(this, "admin.users.setRegular"),
            unsupportedVersions: {
              /**
               * @description Ask Slackbot to send you an export listing all workspace members using unsupported software,
               * presented as a zipped CSV file.
               * @see {@link https://docs.slack.dev/reference/methods/admin.users.unsupportedVersions.export `admin.users.unsupportedVersions.export` API reference}.
               */
              export: bindApiCall(this, "admin.users.unsupportedVersions.export")
            }
          },
          workflows: {
            collaborators: {
              /**
               * @description Add collaborators to workflows within the team or enterprise.
               * @see {@link https://docs.slack.dev/reference/methods/admin.workflows.collaborators.add `admin.workflows.collaborators.add` API reference}.
               */
              add: bindApiCall(this, "admin.workflows.collaborators.add"),
              /**
               * @description Remove collaborators from workflows within the team or enterprise.
               * @see {@link https://docs.slack.dev/reference/methods/admin.workflows.collaborators.remove `admin.workflows.collaborators.remove` API reference}.
               */
              remove: bindApiCall(this, "admin.workflows.collaborators.remove")
            },
            permissions: {
              /**
               * @description Look up the permissions for a set of workflows.
               * @see {@link https://docs.slack.dev/reference/methods/admin.workflows.permissions.lookup `admin.workflows.permissions.lookup` API reference}.
               */
              lookup: bindApiCall(this, "admin.workflows.permissions.lookup")
            },
            /**
             * @description Search workflows within the team or enterprise.
             * @see {@link https://docs.slack.dev/reference/methods/admin.workflows.search `admin.workflows.search` API reference}.
             */
            search: bindApiCallWithOptionalArgument(this, "admin.workflows.search"),
            /**
             * @description Unpublish workflows within the team or enterprise.
             * @see {@link https://docs.slack.dev/reference/methods/admin.workflows.unpublish `admin.workflows.unpublish` API reference}.
             */
            unpublish: bindApiCall(this, "admin.workflows.unpublish")
          }
        };
        this.api = {
          /**
           * @description Checks API calling code.
           * @see {@link https://docs.slack.dev/reference/methods/api.test `api.test` API reference}.
           */
          test: bindApiCallWithOptionalArgument(this, "api.test")
        };
        this.assistant = {
          threads: {
            /**
             * @description Set loading status to indicate that the app is building a response.
             * @see {@link https://docs.slack.dev/reference/methods/assistant.threads.setStatus `assistant.threads.setStatus` API reference}.
             */
            setStatus: bindApiCall(this, "assistant.threads.setStatus"),
            /**
             * @description Set suggested prompts for the user. Can suggest up to four prompts.
             * @see {@link https://docs.slack.dev/reference/methods/assistant.threads.setSuggestedPrompts `assistant.threads.setSuggestedPrompts` API reference}.
             */
            setSuggestedPrompts: bindApiCall(this, "assistant.threads.setSuggestedPrompts"),
            /**
             * @description Set the title of the thread. This is shown when a user views the app's chat history.
             * @see {@link https://docs.slack.dev/reference/methods/assistant.threads.setTitle `assistant.threads.setTitle` API reference}.
             */
            setTitle: bindApiCall(this, "assistant.threads.setTitle")
          }
        };
        this.apps = {
          connections: {
            /**
             * @description Generate a temporary Socket Mode WebSocket URL that your app can connect to in order to receive
             * events and interactive payloads over.
             * @see {@link https://docs.slack.dev/reference/methods/apps.connections.open `apps.connections.open` API reference}.
             */
            open: bindApiCallWithOptionalArgument(this, "apps.connections.open")
          },
          event: {
            authorizations: {
              /**
               * @description Get a list of authorizations for the given event context.
               * Each authorization represents an app installation that the event is visible to.
               * @see {@link https://docs.slack.dev/reference/methods/apps.event.authorizations.list `apps.event.authorizations.list` API reference}.
               */
              list: bindApiCall(this, "apps.event.authorizations.list")
            }
          },
          manifest: {
            /**
             * @description Create an app from an app manifest.
             * @see {@link https://docs.slack.dev/reference/methods/apps.manifest.create `apps.manifest.create` API reference}.
             */
            create: bindApiCall(this, "apps.manifest.create"),
            /**
             * @description Permanently deletes an app created through app manifests.
             * @see {@link https://docs.slack.dev/reference/methods/apps.manifest.delete `apps.manifest.delete` API reference}.
             */
            delete: bindApiCall(this, "apps.manifest.delete"),
            /**
             * @description Export an app manifest from an existing app.
             * @see {@link https://docs.slack.dev/reference/methods/apps.manifest.export `apps.manifest.export` API reference}.
             */
            export: bindApiCall(this, "apps.manifest.export"),
            /**
             * @description Update an app from an app manifest.
             * @see {@link https://docs.slack.dev/reference/methods/apps.manifest.update `apps.manifest.update` API reference}.
             */
            update: bindApiCall(this, "apps.manifest.update"),
            /**
             * @description Validate an app manifest.
             * @see {@link https://docs.slack.dev/reference/methods/apps.manifest.validate `apps.manifest.validate` API reference}.
             */
            validate: bindApiCall(this, "apps.manifest.validate")
          },
          /**
           * @description Uninstalls your app from a workspace.
           * @see {@link https://docs.slack.dev/reference/methods/apps.uninstall `apps.uninstall` API reference}.
           */
          uninstall: bindApiCall(this, "apps.uninstall")
        };
        this.auth = {
          /**
           * @description Revokes a token.
           * @see {@link https://docs.slack.dev/reference/methods/auth.revoke `auth.revoke` API reference}.
           */
          revoke: bindApiCallWithOptionalArgument(this, "auth.revoke"),
          teams: {
            /**
             * @description Obtain a full list of workspaces your org-wide app has been approved for.
             * @see {@link https://docs.slack.dev/reference/methods/auth.teams.list `auth.teams.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "auth.teams.list")
          },
          test: bindApiCallWithOptionalArgument(this, "auth.test")
        };
        this.bookmarks = {
          /**
           * @description Add bookmark to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/bookmarks.add `bookmarks.add` API reference}.
           */
          add: bindApiCall(this, "bookmarks.add"),
          /**
           * @description Edit bookmark.
           * @see {@link https://docs.slack.dev/reference/methods/bookmarks.edit `bookmarks.edit` API reference}.
           */
          edit: bindApiCall(this, "bookmarks.edit"),
          /**
           * @description List bookmarks for a channel.
           * @see {@link https://docs.slack.dev/reference/methods/bookmarks.list `bookmarks.list` API reference}.
           */
          list: bindApiCall(this, "bookmarks.list"),
          /**
           * @description Remove bookmark from a channel.
           * @see {@link https://docs.slack.dev/reference/methods/bookmarks.remove `bookmarks.remove` API reference}.
           */
          remove: bindApiCall(this, "bookmarks.remove")
        };
        this.bots = {
          /**
           * @description Gets information about a bot user.
           * @see {@link https://docs.slack.dev/reference/methods/bots.info `bots.info` API reference}.
           */
          info: bindApiCallWithOptionalArgument(this, "bots.info")
        };
        this.calls = {
          /**
           * @description Registers a new Call.
           * @see {@link https://docs.slack.dev/reference/methods/calls.add `calls.add` API reference}.
           */
          add: bindApiCall(this, "calls.add"),
          /**
           * @description Ends a Call.
           * @see {@link https://docs.slack.dev/reference/methods/calls.end `calls.end` API reference}.
           */
          end: bindApiCall(this, "calls.end"),
          /**
           * @description Returns information about a Call.
           * @see {@link https://docs.slack.dev/reference/methods/calls.info `calls.info` API reference}.
           */
          info: bindApiCall(this, "calls.info"),
          /**
           * @description Updates information about a Call.
           * @see {@link https://docs.slack.dev/reference/methods/calls.update `calls.update` API reference}.
           */
          update: bindApiCall(this, "calls.update"),
          participants: {
            /**
             * @description Registers new participants added to a Call.
             * @see {@link https://docs.slack.dev/reference/methods/calls.participants.add `calls.participants.add` API reference}.
             */
            add: bindApiCall(this, "calls.participants.add"),
            remove: bindApiCall(this, "calls.participants.remove")
          }
        };
        this.canvases = {
          access: {
            /**
             * @description Remove access to a canvas for specified entities.
             * @see {@link https://docs.slack.dev/reference/methods/canvases.access.delete `canvases.access.delete` API reference}.
             */
            delete: bindApiCall(this, "canvases.access.delete"),
            /**
             * @description Sets the access level to a canvas for specified entities.
             * @see {@link https://docs.slack.dev/reference/methods/canvases.access.set `canvases.access.set` API reference}.
             */
            set: bindApiCall(this, "canvases.access.set")
          },
          /**
           * @description Create Canvas for a user.
           * @see {@link https://docs.slack.dev/reference/methods/canvases.create `canvases.create` API reference}.
           */
          create: bindApiCallWithOptionalArgument(this, "canvases.create"),
          /**
           * @description Deletes a canvas.
           * @see {@link https://docs.slack.dev/reference/methods/canvases.delete `canvases.delete` API reference}.
           */
          delete: bindApiCall(this, "canvases.delete"),
          /**
           * @description Update an existing canvas.
           * @see {@link https://docs.slack.dev/reference/methods/canvases.edit `canvases.edit` API reference}.
           */
          edit: bindApiCall(this, "canvases.edit"),
          sections: {
            /**
             * @description Find sections matching the provided criteria.
             * @see {@link https://docs.slack.dev/reference/methods/canvases.sections.lookup `canvases.sections.lookup` API reference}.
             */
            lookup: bindApiCall(this, "canvases.sections.lookup")
          }
        };
        this.chat = {
          /**
           * @description Appends text to an existing streaming conversation.
           * @see {@link https://docs.slack.dev/reference/methods/chat.appendStream `chat.appendStream` API reference}.
           */
          appendStream: bindApiCall(this, "chat.appendStream"),
          /**
           * @description Deletes a message.
           * @see {@link https://docs.slack.dev/reference/methods/chat.delete `chat.delete` API reference}.
           */
          delete: bindApiCall(this, "chat.delete"),
          /**
           * @description Deletes a pending scheduled message from the queue.
           * @see {@link https://docs.slack.dev/reference/methods/chat.deleteScheduledMessage `chat.deleteScheduledMessage` API reference}.
           */
          deleteScheduledMessage: bindApiCall(this, "chat.deleteScheduledMessage"),
          /**
           * @description Retrieve a permalink URL for a specific extant message.
           * @see {@link https://docs.slack.dev/reference/methods/chat.getPermalink `chat.getPermalink` API reference}.
           */
          getPermalink: bindApiCall(this, "chat.getPermalink"),
          /**
           * @description Share a me message into a channel.
           * @see {@link https://docs.slack.dev/reference/methods/chat.meMessage `chat.meMessage` API reference}.
           */
          meMessage: bindApiCall(this, "chat.meMessage"),
          /**
           * @description Sends an ephemeral message to a user in a channel.
           * @see {@link https://docs.slack.dev/reference/methods/chat.postEphemeral `chat.postEphemeral` API reference}.
           */
          postEphemeral: bindApiCall(this, "chat.postEphemeral"),
          /**
           * @description Sends a message to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/chat.postMessage `chat.postMessage` API reference}.
           */
          postMessage: bindApiCall(this, "chat.postMessage"),
          /**
           * @description Schedules a message to be sent to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/chat.scheduleMessage `chat.scheduleMessage` API reference}.
           */
          scheduleMessage: bindApiCall(this, "chat.scheduleMessage"),
          scheduledMessages: {
            /**
             * @description Returns a list of scheduled messages.
             * @see {@link https://docs.slack.dev/reference/methods/chat.scheduledMessages.list `chat.scheduledMessages.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "chat.scheduledMessages.list")
          },
          /**
           * @description Starts a new streaming conversation.
           * @see {@link https://docs.slack.dev/reference/methods/chat.startStream `chat.startStream` API reference}.
           */
          startStream: bindApiCall(this, "chat.startStream"),
          /**
           * @description Stops a streaming conversation.
           * @see {@link https://docs.slack.dev/reference/methods/chat.stopStream `chat.stopStream` API reference}.
           */
          stopStream: bindApiCall(this, "chat.stopStream"),
          /**
           * @description Provide custom unfurl behavior for user-posted URLs.
           * @see {@link https://docs.slack.dev/reference/methods/chat.unfurl `chat.unfurl` API reference}.
           */
          unfurl: bindApiCall(this, "chat.unfurl"),
          /**
           * @description Updates a message.
           * @see {@link https://docs.slack.dev/reference/methods/chat.update `chat.update` API reference}.
           */
          update: bindApiCall(this, "chat.update")
        };
        this.conversations = {
          /**
           * @description Accepts an invitation to a Slack Connect channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.acceptSharedInvite `conversations.acceptSharedInvite` API reference}.
           */
          acceptSharedInvite: bindApiCall(this, "conversations.acceptSharedInvite"),
          /**
           * @description Approves an invitation to a Slack Connect channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.approveSharedInvite `conversations.approveSharedInvite` API reference}.
           */
          approveSharedInvite: bindApiCall(this, "conversations.approveSharedInvite"),
          /**
           * @description Archives a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.archive `conversations.archive` API reference}.
           */
          archive: bindApiCall(this, "conversations.archive"),
          canvases: {
            /**
             * @description Create a Channel Canvas for a channel.
             * @see {@link https://docs.slack.dev/reference/methods/conversations.canvases.create `conversations.canvases.create` API reference}.
             */
            create: bindApiCall(this, "conversations.canvases.create")
          },
          /**
           * @description Closes a direct message or multi-person direct message.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.close `conversations.close` API reference}.
           */
          close: bindApiCall(this, "conversations.close"),
          /**
           * @description Initiates a public or private channel-based conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.create `conversations.create` API reference}.
           */
          create: bindApiCall(this, "conversations.create"),
          /**
           * @description Declines an invitation to a Slack Connect channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.declineSharedInvite `conversations.declineSharedInvite` API reference}.
           */
          declineSharedInvite: bindApiCall(this, "conversations.declineSharedInvite"),
          externalInvitePermissions: {
            /**
             * @description Convert a team in a shared channel from an External Limited channel to a fully shared Slack
             * Connect channel or vice versa.
             * @see {@link https://docs.slack.dev/reference/methods/conversations.externalInvitePermissions.set `conversations.externalInvitePermissions.set` API reference}.
             */
            set: bindApiCall(this, "conversations.externalInvitePermissions.set")
          },
          /**
           * @description Fetches a conversation's history of messages and events.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.history `conversations.history` API reference}.
           */
          history: bindApiCall(this, "conversations.history"),
          /**
           * @description Retrieve information about a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.info `conversations.info` API reference}.
           */
          info: bindApiCall(this, "conversations.info"),
          /**
           * @description Invites users to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.invite `conversations.invite` API reference}.
           */
          invite: bindApiCall(this, "conversations.invite"),
          /**
           * @description Sends an invitation to a Slack Connect channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.inviteShared `conversations.inviteShared` API reference}.
           */
          inviteShared: bindApiCall(this, "conversations.inviteShared"),
          /**
           * @description Joins an existing conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.join `conversations.join` API reference}.
           */
          join: bindApiCall(this, "conversations.join"),
          /**
           * @description Removes a user from a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.kick `conversations.kick` API reference}.
           */
          kick: bindApiCall(this, "conversations.kick"),
          /**
           * @description Leaves a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.leave `conversations.leave` API reference}.
           */
          leave: bindApiCall(this, "conversations.leave"),
          /**
           * @description List all channels in a Slack team.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.list `conversations.list` API reference}.
           */
          list: bindApiCallWithOptionalArgument(this, "conversations.list"),
          /**
           * @description Lists shared channel invites that have been generated or received but have not been approved by
           * all parties.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.listConnectInvites `conversations.listConnectInvites` API reference}.
           */
          listConnectInvites: bindApiCallWithOptionalArgument(this, "conversations.listConnectInvites"),
          /**
           * @description Sets the read cursor in a channel.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.mark `conversations.mark` API reference}.
           */
          mark: bindApiCall(this, "conversations.mark"),
          /**
           * @description Retrieve members of a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.members `conversations.members` API reference}.
           */
          members: bindApiCall(this, "conversations.members"),
          /**
           * @description Opens or resumes a direct message or multi-person direct message.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.open `conversations.open` API reference}.
           */
          open: bindApiCall(this, "conversations.open"),
          /**
           * @description Renames a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.rename `conversations.rename` API reference}.
           */
          rename: bindApiCall(this, "conversations.rename"),
          /**
           * @description Retrieve a thread of messages posted to a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.replies `conversations.replies` API reference}.
           */
          replies: bindApiCall(this, "conversations.replies"),
          requestSharedInvite: {
            /**
             * @description Approves a request to add an external user to a channel and sends them a Slack Connect invite.
             * @see {@link https://docs.slack.dev/reference/methods/conversations.requestSharedInvite.approve `conversations.requestSharedInvite.approve` API reference}.
             */
            approve: bindApiCall(this, "conversations.requestSharedInvite.approve"),
            /**
             * @description Denies a request to invite an external user to a channel.
             * @see {@link https://docs.slack.dev/reference/methods/conversations.requestSharedInvite.deny `conversations.requestSharedInvite.deny` API reference}.
             */
            deny: bindApiCall(this, "conversations.requestSharedInvite.deny"),
            /**
             * @description Lists requests to add external users to channels with ability to filter.
             * @see {@link https://docs.slack.dev/reference/methods/conversations.requestSharedInvite.list `conversations.requestSharedInvite.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "conversations.requestSharedInvite.list")
          },
          /**
           * @description Sets the purpose for a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.setPurpose `conversations.setPurpose` API reference}.
           */
          setPurpose: bindApiCall(this, "conversations.setPurpose"),
          /**
           * @description Sets the topic for a conversation.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.setTopic `conversations.setTopic` API reference}.
           */
          setTopic: bindApiCall(this, "conversations.setTopic"),
          /**
           * @description Reverses conversation archival.
           * @see {@link https://docs.slack.dev/reference/methods/conversations.unarchive `conversations.unarchive` API reference}.
           */
          unarchive: bindApiCall(this, "conversations.unarchive")
        };
        this.dialog = {
          /**
           * @description Open a dialog with a user.
           * @see {@link https://docs.slack.dev/reference/methods/dialog.open `dialog.open` API reference}.
           */
          open: bindApiCall(this, "dialog.open")
        };
        this.dnd = {
          /**
           * @description Ends the current user's Do Not Disturb session immediately.
           * @see {@link https://docs.slack.dev/reference/methods/dnd.endDnd `dnd.endDnd` API reference}.
           */
          endDnd: bindApiCallWithOptionalArgument(this, "dnd.endDnd"),
          /**
           * @description Ends the current user's snooze mode immediately.
           * @see {@link https://docs.slack.dev/reference/methods/dnd.endSnooze `dnd.endSnooze` API reference}.
           */
          endSnooze: bindApiCallWithOptionalArgument(this, "dnd.endSnooze"),
          /**
           * @description Retrieves a user's current Do Not Disturb status.
           * @see {@link https://docs.slack.dev/reference/methods/dnd.info `dnd.info` API reference}.
           */
          info: bindApiCallWithOptionalArgument(this, "dnd.info"),
          /**
           * @description Turns on Do Not Disturb mode for the current user, or changes its duration.
           * @see {@link https://docs.slack.dev/reference/methods/dnd.setSnooze `dnd.setSnooze` API reference}.
           */
          setSnooze: bindApiCall(this, "dnd.setSnooze"),
          /**
           * @description Retrieves the Do Not Disturb status for up to 50 users on a team.
           * @see {@link https://docs.slack.dev/reference/methods/dnd.teamInfo `dnd.teamInfo` API reference}.
           */
          teamInfo: bindApiCall(this, "dnd.teamInfo")
        };
        this.emoji = {
          /**
           * @description Lists custom emoji for a team.
           * @see {@link https://docs.slack.dev/reference/methods/emoji.list `emoji.list` API reference}.
           */
          list: bindApiCallWithOptionalArgument(this, "emoji.list")
        };
        this.entity = {
          /**
           * @description Provide information about the entity to be displayed in the flexpane.
           * @see {@link https://docs.slack.dev/reference/methods/entity.presentDetails}
           */
          presentDetails: bindApiCall(this, "entity.presentDetails")
        };
        this.files = {
          /**
           * @description Finishes an upload started with {@link https://docs.slack.dev/reference/methods/files.getUploadURLExternal `files.getUploadURLExternal`}.
           * @see {@link https://docs.slack.dev/reference/methods/files.completeUploadExternal `files.completeUploadExternal` API reference}.
           */
          completeUploadExternal: bindApiCall(this, "files.completeUploadExternal"),
          /**
           * @description Deletes a file.
           * @see {@link https://docs.slack.dev/reference/methods/files.delete `files.delete` API reference}.
           */
          delete: bindApiCall(this, "files.delete"),
          /**
           * @description Gets a URL for an edge external file upload.
           * @see {@link https://docs.slack.dev/reference/methods/files.getUploadURLExternal `files.getUploadURLExternal` API reference}.
           */
          getUploadURLExternal: bindApiCall(this, "files.getUploadURLExternal"),
          /**
           * @description Gets information about a file.
           * @see {@link https://docs.slack.dev/reference/methods/files.info `files.info` API reference}.
           */
          info: bindApiCall(this, "files.info"),
          /**
           * @description List files for a team, in a channel, or from a user with applied filters.
           * @see {@link https://docs.slack.dev/reference/methods/files.list `files.list` API reference}.
           */
          list: bindApiCall(this, "files.list"),
          /**
           * @description Revokes public/external sharing access for a file.
           * @see {@link https://docs.slack.dev/reference/methods/files.revokePublicURL `files.revokePublicURL` API reference}.
           */
          revokePublicURL: bindApiCall(this, "files.revokePublicURL"),
          /**
           * @description Enables a file for public/external sharing.
           * @see {@link https://docs.slack.dev/reference/methods/files.sharedPublicURL `files.sharedPublicURL` API reference}.
           */
          sharedPublicURL: bindApiCall(this, "files.sharedPublicURL"),
          /**
           * @description Uploads or creates a file.
           * @deprecated Use `uploadV2` instead. See {@link https://docs.slack.dev/changelog/2024-04-a-better-way-to-upload-files-is-here-to-stay our post on retiring `files.upload`}.
           * @see {@link https://docs.slack.dev/reference/methods/files.upload `files.upload` API reference}.
           */
          upload: bindApiCall(this, "files.upload"),
          /**
           * @description Custom method to support a new way of uploading files to Slack.
           * Supports a single file upload
           * Supply:
           * - (required) single file or content
           * - (optional) channel, alt_text, snippet_type,
           * Supports multiple file uploads
           * Supply:
           * - multiple upload_files
           * Will try to honor both single file or content data supplied as well
           * as multiple file uploads property.
           * @see {@link https://docs.slack.dev/tools/node-slack-sdk/web-api/#upload-a-file `@slack/web-api` Upload a file documentation}.
           */
          uploadV2: bindFilesUploadV2(this),
          comments: {
            /**
             * @description Deletes an existing comment on a file.
             * @see {@link https://docs.slack.dev/reference/methods/files.comments.delete `files.comments.delete` API reference}.
             */
            delete: bindApiCall(this, "files.comments.delete")
          },
          remote: {
            /**
             * @description Adds a file from a remote service.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.add `files.remote.add` API reference}.
             */
            add: bindApiCall(this, "files.remote.add"),
            /**
             * @description Retrieve information about a remote file added to Slack.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.info `files.remote.info` API reference}.
             */
            info: bindApiCall(this, "files.remote.info"),
            /**
             * @description List remote files added to Slack.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.list `files.remote.list` API reference}.
             */
            list: bindApiCall(this, "files.remote.list"),
            /**
             * @description Remove a remote file.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.remove `files.remote.remove` API reference}.
             */
            remove: bindApiCall(this, "files.remote.remove"),
            /**
             * @description Share a remote file into a channel.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.share `files.remote.share` API reference}.
             */
            share: bindApiCall(this, "files.remote.share"),
            /**
             * @description Updates an existing remote file.
             * @see {@link https://docs.slack.dev/reference/methods/files.remote.update `files.remote.update` API reference}.
             */
            update: bindApiCall(this, "files.remote.update")
          }
        };
        this.functions = {
          /**
           * @description Signal the failure to execute a Custom Function.
           * @see {@link https://docs.slack.dev/reference/methods/functions.completeError `functions.completeError` API reference}.
           */
          completeError: bindApiCall(this, "functions.completeError"),
          /**
           * @description Signal the successful completion of a Custom Function.
           * @see {@link https://docs.slack.dev/reference/methods/functions.completeSuccess `functions.completeSuccess` API reference}.
           */
          completeSuccess: bindApiCall(this, "functions.completeSuccess")
        };
        this.migration = {
          /**
           * @description For Enterprise Grid workspaces, map local user IDs to global user IDs.
           * @see {@link https://docs.slack.dev/reference/methods/migration.exchange `migration.exchange` API reference}.
           */
          exchange: bindApiCall(this, "migration.exchange")
        };
        this.oauth = {
          /**
           * @description Exchanges a temporary OAuth verifier code for an access token.
           * @deprecated This is a legacy method only used by classic Slack apps. Use `oauth.v2.access` for new Slack apps.
           * @see {@link https://docs.slack.dev/reference/methods/oauth.access `oauth.access` API reference}.
           */
          access: bindApiCall(this, "oauth.access"),
          v2: {
            /**
             * @description Exchanges a temporary OAuth verifier code for an access token.
             * @see {@link https://docs.slack.dev/reference/methods/oauth.v2.access `oauth.v2.access` API reference}.
             */
            access: bindApiCall(this, "oauth.v2.access"),
            /**
             * @description Exchanges a legacy access token for a new expiring access token and refresh token.
             * @see {@link https://docs.slack.dev/reference/methods/oauth.v2.exchange `oauth.v2.exchange` API reference}.
             */
            exchange: bindApiCall(this, "oauth.v2.exchange")
          }
        };
        this.openid = {
          connect: {
            /**
             * @description Exchanges a temporary OAuth verifier code for an access token for {@link https://docs.slack.dev/authentication/sign-in-with-slack Sign in with Slack}.
             * @see {@link https://docs.slack.dev/reference/methods/openid.connect.token `openid.connect.token` API reference}.
             */
            token: bindApiCall(this, "openid.connect.token"),
            /**
             * @description Get the identity of a user who has authorized {@link https://docs.slack.dev/authentication/sign-in-with-slack Sign in with Slack}.
             * @see {@link https://docs.slack.dev/reference/methods/openid.connect.userInfo `openid.connect.userInfo` API reference}.
             */
            userInfo: bindApiCallWithOptionalArgument(this, "openid.connect.userInfo")
          }
        };
        this.pins = {
          /**
           * @description Pins an item to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/pins.add `pins.add` API reference}.
           */
          add: bindApiCall(this, "pins.add"),
          /**
           * @description Lists items pinned to a channel.
           * @see {@link https://docs.slack.dev/reference/methods/pins.list `pins.list` API reference}.
           */
          list: bindApiCall(this, "pins.list"),
          /**
           * @description Un-pins an item from a channel.
           * @see {@link https://docs.slack.dev/reference/methods/pins.remove `pins.remove` API reference}.
           */
          remove: bindApiCall(this, "pins.remove")
        };
        this.reactions = {
          /**
           * @description Adds a reaction to an item.
           * @see {@link https://docs.slack.dev/reference/methods/reactions.add `reactions.add` API reference}.
           */
          add: bindApiCall(this, "reactions.add"),
          /**
           * @description Gets reactions for an item.
           * @see {@link https://docs.slack.dev/reference/methods/reactions.get `reactions.get` API reference}.
           */
          get: bindApiCall(this, "reactions.get"),
          /**
           * @description List reactions made by a user.
           * @see {@link https://docs.slack.dev/reference/methods/reactions.list `reactions.list` API reference}.
           */
          list: bindApiCallWithOptionalArgument(this, "reactions.list"),
          /**
           * @description Removes a reaction from an item.
           * @see {@link https://docs.slack.dev/reference/methods/reactions.remove `reactions.remove` API reference}.
           */
          remove: bindApiCall(this, "reactions.remove")
        };
        this.reminders = {
          /**
           * @description Creates a reminder.
           * @see {@link https://docs.slack.dev/reference/methods/reminders.add `reminders.add` API reference}.
           */
          add: bindApiCall(this, "reminders.add"),
          /**
           * @description Marks a reminder as complete.
           * @see {@link https://docs.slack.dev/reference/methods/reminders.complete `reminders.complete` API reference}.
           */
          complete: bindApiCall(this, "reminders.complete"),
          /**
           * @description Deletes a reminder.
           * @see {@link https://docs.slack.dev/reference/methods/reminders.delete `reminders.delete` API reference}.
           */
          delete: bindApiCall(this, "reminders.delete"),
          /**
           * @description Gets information about a reminder.
           * @see {@link https://docs.slack.dev/reference/methods/reminders.info `reminders.info` API reference}.
           */
          info: bindApiCall(this, "reminders.info"),
          /**
           * @description Lists all reminders created by or for a given user.
           * @see {@link https://docs.slack.dev/reference/methods/reminders.list `reminders.list` API reference}.
           */
          list: bindApiCallWithOptionalArgument(this, "reminders.list")
        };
        this.rtm = {
          /**
           * @description Starts a Real Time Messaging session.
           * @see {@link https://docs.slack.dev/reference/methods/rtm.connect `rtm.connect` API reference}.
           */
          connect: bindApiCallWithOptionalArgument(this, "rtm.connect"),
          /**
           * @description Starts a Real Time Messaging session.
           * @deprecated Use `rtm.connect` instead. See {@link https://docs.slack.dev/changelog/2021-10-rtm-start-to-stop our post on retiring `rtm.start`}.
           * @see {@link https://docs.slack.dev/reference/methods/rtm.start `rtm.start` API reference}.
           */
          start: bindApiCallWithOptionalArgument(this, "rtm.start")
        };
        this.search = {
          /**
           * @description Searches for messages and files matching a query.
           * @see {@link https://docs.slack.dev/reference/methods/search.all search.all` API reference}.
           */
          all: bindApiCall(this, "search.all"),
          /**
           * @description Searches for files matching a query.
           * @see {@link https://docs.slack.dev/reference/methods/search.files search.files` API reference}.
           */
          files: bindApiCall(this, "search.files"),
          /**
           * @description Searches for messages matching a query.
           * @see {@link https://docs.slack.dev/reference/methods/search.messages search.messages` API reference}.
           */
          messages: bindApiCall(this, "search.messages")
        };
        this.slackLists = {
          access: {
            /**
             * @description Delete access for specified entities.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.access.delete `slackLists.access.delete` API reference}.
             */
            delete: bindApiCall(this, "slackLists.access.delete"),
            /**
             * @description Set access level for specified entities.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.access.set `slackLists.access.set` API reference}.
             */
            set: bindApiCall(this, "slackLists.access.set")
          },
          /**
           * @description Create a List.
           * @see {@link https://docs.slack.dev/reference/methods/slackLists.create `slackLists.create` API reference}.
           */
          create: bindApiCall(this, "slackLists.create"),
          download: {
            /**
             * @description Get download job status.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.download.get `slackLists.download.get` API reference}.
             */
            get: bindApiCall(this, "slackLists.download.get"),
            /**
             * @description Start a download job for a list.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.download.start `slackLists.download.start` API reference}.
             */
            start: bindApiCall(this, "slackLists.download.start")
          },
          items: {
            /**
             * @description Create a list item.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.create `slackLists.items.create` API reference}.
             */
            create: bindApiCall(this, "slackLists.items.create"),
            /**
             * @description Delete a list item.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.delete `slackLists.items.delete` API reference}.
             */
            delete: bindApiCall(this, "slackLists.items.delete"),
            /**
             * @description Delete multiple list items.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.deleteMultiple `slackLists.items.deleteMultiple` API reference}.
             */
            deleteMultiple: bindApiCall(this, "slackLists.items.deleteMultiple"),
            /**
             * @description Get info about a list item.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.info `slackLists.items.info` API reference}.
             */
            info: bindApiCall(this, "slackLists.items.info"),
            /**
             * @description Get records from a List.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.list `slackLists.items.list` API reference}.
             */
            list: bindApiCall(this, "slackLists.items.list"),
            /**
             * @description Update a list item.
             * @see {@link https://docs.slack.dev/reference/methods/slackLists.items.update `slackLists.items.update` API reference}.
             */
            update: bindApiCall(this, "slackLists.items.update")
          },
          /**
           * @description Update a list.
           * @see {@link https://docs.slack.dev/reference/methods/slackLists.update `slackLists.update` API reference}.
           */
          update: bindApiCall(this, "slackLists.update")
        };
        this.team = {
          /**
           * @description Gets the access logs for the current team.
           * @see {@link https://docs.slack.dev/reference/methods/team.accessLogs `team.accessLogs` API reference}.
           */
          accessLogs: bindApiCallWithOptionalArgument(this, "team.accessLogs"),
          /**
           * @description Gets billable users information for the current team.
           * @see {@link https://docs.slack.dev/reference/methods/team.billableInfo `team.billableInfo` API reference}.
           */
          billableInfo: bindApiCallWithOptionalArgument(this, "team.billableInfo"),
          billing: {
            /**
             * @description Reads a workspace's billing plan information.
             * @see {@link https://docs.slack.dev/reference/methods/team.billing.info `team.billing.info` API reference}.
             */
            info: bindApiCall(this, "team.billing.info")
          },
          externalTeams: {
            /**
             * @description Disconnect an external organization.
             * @see {@link https://docs.slack.dev/reference/methods/team.externalTeams.disconnect `team.externalTeams.disconnect` API reference}.
             */
            disconnect: bindApiCall(this, "team.externalTeams.disconnect"),
            /**
             * @description Returns a list of all the external teams connected and details about the connection.
             * @see {@link https://docs.slack.dev/reference/methods/team.externalTeams.list `team.externalTeams.list` API reference}.
             */
            list: bindApiCall(this, "team.externalTeams.list")
          },
          /**
           * @description Gets information about the current team.
           * @see {@link https://docs.slack.dev/reference/methods/team.info `team.info` API reference}.
           */
          info: bindApiCallWithOptionalArgument(this, "team.info"),
          /**
           * @description Gets the integration logs for the current team.
           * @see {@link https://docs.slack.dev/reference/methods/team.integrationLogs `team.integrationLogs` API reference}.
           */
          integrationLogs: bindApiCallWithOptionalArgument(this, "team.integrationLogs"),
          preferences: {
            /**
             * @description Retrieve a list of a workspace's team preferences.
             * @see {@link https://docs.slack.dev/reference/methods/team.preferences.list `team.preferences.list` API reference}.
             */
            list: bindApiCallWithOptionalArgument(this, "team.preferences.list")
          },
          profile: {
            /**
             * @description Retrieve a team's profile.
             * @see {@link https://docs.slack.dev/reference/methods/team.profile.get `team.profile.get` API reference}.
             */
            get: bindApiCallWithOptionalArgument(this, "team.profile.get")
          }
        };
        this.tooling = {
          tokens: {
            /**
             * @description Exchanges a refresh token for a new app configuration token.
             * @see {@link https://docs.slack.dev/reference/methods/tooling.tokens.rotate `tooling.tokens.rotate` API reference}.
             */
            rotate: bindApiCall(this, "tooling.tokens.rotate")
          }
        };
        this.usergroups = {
          /**
           * @description Create a User Group.
           * @see {@link https://docs.slack.dev/reference/methods/usergroups.create `usergroups.create` API reference}.
           */
          create: bindApiCall(this, "usergroups.create"),
          /**
           * @description Disable an existing User Group.
           * @see {@link https://docs.slack.dev/reference/methods/usergroups.disable `usergroups.disable` API reference}.
           */
          disable: bindApiCall(this, "usergroups.disable"),
          /**
           * @description Enable an existing User Group.
           * @see {@link https://docs.slack.dev/reference/methods/usergroups.enable `usergroups.enable` API reference}.
           */
          enable: bindApiCall(this, "usergroups.enable"),
          /**
           * @description List all User Groups for a team.
           * @see {@link https://docs.slack.dev/reference/methods/usergroups.list `usergroups.list` API reference}.
           */
          list: bindApiCallWithOptionalArgument(this, "usergroups.list"),
          /**
           * @description Update an existing User Group.
           * @see {@link https://docs.slack.dev/reference/methods/usergroups.update `usergroups.update` API reference}.
           */
          update: bindApiCall(this, "usergroups.update"),
          users: {
            /**
             * @description List all users in a User Group.
             * @see {@link https://docs.slack.dev/reference/methods/usergroups.users.list `usergroups.users.list` API reference}.
             */
            list: bindApiCall(this, "usergroups.users.list"),
            /**
             * @description Update the list of users in a User Group.
             * @see {@link https://docs.slack.dev/reference/methods/usergroups.users.update `usergroups.users.update` API reference}.
             */
            update: bindApiCall(this, "usergroups.users.update")
          }
        };
        this.users = {
          /**
           * @description List conversations the calling user may access.
           * @see {@link https://docs.slack.dev/reference/methods/users.conversations `users.conversations` API reference}.
           */
          conversations: bindApiCall(this, "users.conversations"),
          /**
           * @description Delete the user profile photo.
           * @see {@link https://docs.slack.dev/reference/methods/users.deletePhoto `users.deletePhoto` API reference}.
           */
          deletePhoto: bindApiCall(this, "users.deletePhoto"),
          discoverableContacts: {
            /**
             * @description Lookup an email address to see if someone is on Slack.
             * @see {@link https://docs.slack.dev/reference/methods/users.discoverableContacts.lookup `users.discoverableContacts.lookup` API reference}.
             */
            lookup: bindApiCall(this, "users.discoverableContacts.lookup")
          },
          /**
           * @description Gets user presence information.
           * @see {@link https://docs.slack.dev/reference/methods/users.getPresence `users.getPresence` API reference}.
           */
          getPresence: bindApiCall(this, "users.getPresence"),
          /**
           * @description Get a user's identity.
           * @see {@link https://docs.slack.dev/reference/methods/users.identity `users.identity` API reference}.
           */
          identity: bindApiCall(this, "users.identity"),
          /**
           * @description Gets information about a user.
           * @see {@link https://docs.slack.dev/reference/methods/users.info `users.info` API reference}.
           */
          info: bindApiCall(this, "users.info"),
          /**
           * @description Lists all users in a Slack team.
           * @see {@link https://docs.slack.dev/reference/methods/users.list `users.list` API reference}.
           */
          list: bindApiCall(this, "users.list"),
          /**
           * @description Find a user with an email address.
           * @see {@link https://docs.slack.dev/reference/methods/users.lookupByEmail `users.lookupByEmail` API reference}.
           */
          lookupByEmail: bindApiCall(this, "users.lookupByEmail"),
          /**
           * @description Set the user profile photo.
           * @see {@link https://docs.slack.dev/reference/methods/users.setPhoto `users.setPhoto` API reference}.
           */
          setPhoto: bindApiCall(this, "users.setPhoto"),
          /**
           * @description Manually sets user presence.
           * @see {@link https://docs.slack.dev/reference/methods/users.setPresence `users.setPresence` API reference}.
           */
          setPresence: bindApiCall(this, "users.setPresence"),
          profile: {
            /**
             * @description Retrieve a user's profile information, including their custom status.
             * @see {@link https://docs.slack.dev/reference/methods/users.profile.get `users.profile.get` API reference}.
             */
            get: bindApiCall(this, "users.profile.get"),
            /**
             * @description Set a user's profile information, including custom status.
             * @see {@link https://docs.slack.dev/reference/methods/users.profile.set `users.profile.set` API reference}.
             */
            set: bindApiCall(this, "users.profile.set")
          }
        };
        this.views = {
          /**
           * @description Open a view for a user.
           * @see {@link https://docs.slack.dev/reference/methods/views.open `views.open` API reference}.
           */
          open: bindApiCall(this, "views.open"),
          /**
           * @description Publish a static view for a user.
           * @see {@link https://docs.slack.dev/reference/methods/views.publish `views.publish` API reference}.
           */
          publish: bindApiCall(this, "views.publish"),
          /**
           * @description Push a view onto the stack of a root view.
           * @see {@link https://docs.slack.dev/reference/methods/views.push `views.push` API reference}.
           */
          push: bindApiCall(this, "views.push"),
          /**
           * @description Update an existing view.
           * @see {@link https://docs.slack.dev/reference/methods/views.update `views.update` API reference}.
           */
          update: bindApiCall(this, "views.update")
        };
        this.stars = {
          /**
           * @description Save an item for later. Formerly known as adding a star.
           * @deprecated Stars can still be added but they can no longer be viewed or interacted with by end-users.
           * See {@link https://docs.slack.dev/changelog/2023-07-its-later-already-for-stars-and-reminders our post on stars and the Later list}.
           * @see {@link https://docs.slack.dev/reference/methods/stars.add `stars.add` API reference}.
           */
          add: bindApiCall(this, "stars.add"),
          /**
           * @description List a user's saved items, formerly known as stars.
           * @deprecated Stars can still be listed but they can no longer be viewed or interacted with by end-users.
           * See {@link https://docs.slack.dev/changelog/2023-07-its-later-already-for-stars-and-reminders our post on stars and the Later list}.
           * @see {@link https://docs.slack.dev/reference/methods/stars.list `stars.list` API reference}.
           */
          list: bindApiCall(this, "stars.list"),
          /**
           * @description Remove a saved item from a user's saved items, formerly known as stars.
           * @deprecated Stars can still be removed but they can no longer be viewed or interacted with by end-users.
           * See {@link https://docs.slack.dev/changelog/2023-07-its-later-already-for-stars-and-reminders our post on stars and the Later list}.
           * @see {@link https://docs.slack.dev/reference/methods/stars.remove `stars.remove` API reference}.
           */
          remove: bindApiCall(this, "stars.remove")
        };
        this.workflows = {
          featured: {
            /**
             * @description Add featured workflows to a channel.
             * @see {@link https://docs.slack.dev/reference/methods/workflows.featured.add `workflows.featured.add` API reference}.
             */
            add: bindApiCall(this, "workflows.featured.add"),
            /**
             * @description List the featured workflows for specified channels.
             * @see {@link https://docs.slack.dev/reference/methods/workflows.featured.list `workflows.featured.list` API reference}.
             */
            list: bindApiCall(this, "workflows.featured.list"),
            /**
             * @description Remove featured workflows from a channel.
             * @see {@link https://docs.slack.dev/reference/methods/workflows.featured.remove `workflows.featured.remove` API reference}.
             */
            remove: bindApiCall(this, "workflows.featured.remove"),
            /**
             * @description Set featured workflows for a channel.
             * @see {@link https://docs.slack.dev/reference/methods/workflows.featured.set `workflows.featured.set` API reference}.
             */
            set: bindApiCall(this, "workflows.featured.set")
          },
          /**
           * @description Indicate that an app's step in a workflow completed execution.
           * @deprecated Steps from Apps is deprecated.
           * We're retiring all Slack app functionality around Steps from Apps in September 2024.
           * See {@link https://docs.slack.dev/changelog/2023-08-workflow-steps-from-apps-step-back our post on deprecating Steps from Apps}.
           * @see {@link https://docs.slack.dev/legacy/legacy-steps-from-apps/legacy-steps-from-apps-workflow_step-object `workflows.stepCompleted` API reference}.
           */
          stepCompleted: bindApiCall(this, "workflows.stepCompleted"),
          /**
           * @description Indicate that an app's step in a workflow failed to execute.
           * @deprecated Steps from Apps is deprecated.
           * We're retiring all Slack app functionality around Steps from Apps in September 2024.
           * See {@link https://docs.slack.dev/changelog/2023-08-workflow-steps-from-apps-step-back our post on deprecating Steps from Apps}.
           * @see {@link https://docs.slack.dev/legacy/legacy-steps-from-apps/legacy-steps-from-apps-workflow_step-object `workflows.stepFailed` API reference}.
           */
          stepFailed: bindApiCall(this, "workflows.stepFailed"),
          /**
           * @description Update the configuration for a workflow step.
           * @deprecated Steps from Apps is deprecated.
           * We're retiring all Slack app functionality around Steps from Apps in September 2024.
           * See {@link https://docs.slack.dev/changelog/2023-08-workflow-steps-from-apps-step-back our post on deprecating Steps from Apps}.
           * @see {@link https://docs.slack.dev/legacy/legacy-steps-from-apps/legacy-steps-from-apps-workflow_step-object `workflows.updateStep` API reference}.
           */
          updateStep: bindApiCall(this, "workflows.updateStep")
        };
        if (new.target !== WebClient_1.WebClient && !(new.target.prototype instanceof WebClient_1.WebClient)) {
          throw new Error("Attempt to inherit from WebClient methods without inheriting from WebClient");
        }
      }
    };
    exports.Methods = Methods;
    __exportStar(require_dist3(), exports);
  }
});

// node_modules/@slack/web-api/dist/WebClient.js
var require_WebClient = __commonJS({
  "node_modules/@slack/web-api/dist/WebClient.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ function() {
      var ownKeys = /* @__PURE__ */ __name(function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      }, "ownKeys");
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __await = exports && exports.__await || function(v) {
      return this instanceof __await ? (this.v = v, this) : new __await(v);
    };
    var __asyncGenerator = exports && exports.__asyncGenerator || function(thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []), i, q = [];
      return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
        return this;
      }, i;
      function awaitReturn(f) {
        return function(v) {
          return Promise.resolve(v).then(f, reject);
        };
      }
      __name(awaitReturn, "awaitReturn");
      function verb(n, f) {
        if (g[n]) {
          i[n] = function(v) {
            return new Promise(function(a, b) {
              q.push([n, v, a, b]) > 1 || resume(n, v);
            });
          };
          if (f) i[n] = f(i[n]);
        }
      }
      __name(verb, "verb");
      function resume(n, v) {
        try {
          step(g[n](v));
        } catch (e) {
          settle(q[0][3], e);
        }
      }
      __name(resume, "resume");
      function step(r) {
        r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
      }
      __name(step, "step");
      function fulfill(value) {
        resume("next", value);
      }
      __name(fulfill, "fulfill");
      function reject(value) {
        resume("throw", value);
      }
      __name(reject, "reject");
      function settle(f, v) {
        if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
      }
      __name(settle, "settle");
    };
    var __asyncValues = exports && exports.__asyncValues || function(o) {
      if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
      var m = o[Symbol.asyncIterator], i;
      return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
        return this;
      }, i);
      function verb(n) {
        i[n] = o[n] && function(v) {
          return new Promise(function(resolve, reject) {
            v = o[n](v), settle(resolve, reject, v.done, v.value);
          });
        };
      }
      __name(verb, "verb");
      function settle(resolve, reject, d, v) {
        Promise.resolve(v).then(function(v2) {
          resolve({ value: v2, done: d });
        }, reject);
      }
      __name(settle, "settle");
    };
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebClient = exports.WebClientEvent = void 0;
    exports.buildThreadTsWarningMessage = buildThreadTsWarningMessage;
    var node_path_1 = __require("node:path");
    var node_querystring_1 = __require("node:querystring");
    var node_util_1 = __require("node:util");
    var node_zlib_1 = __importDefault(__require("node:zlib"));
    var axios_1 = __importDefault(require_axios());
    var form_data_1 = __importDefault(require_form_data());
    var is_electron_1 = __importDefault(require_is_electron());
    var is_stream_1 = __importDefault(require_is_stream());
    var p_queue_1 = __importDefault(require_dist2());
    var p_retry_1 = __importStar(require_p_retry());
    var chat_stream_1 = require_chat_stream();
    var errors_1 = require_errors();
    var file_upload_1 = require_file_upload();
    var helpers_1 = __importDefault(require_helpers());
    var instrument_1 = require_instrument();
    var logger_1 = require_logger();
    var methods_1 = require_methods();
    var retry_policies_1 = require_retry_policies();
    var axiosHeaderPropsToIgnore = [
      "delete",
      "common",
      "get",
      "put",
      "head",
      "post",
      "link",
      "patch",
      "purge",
      "unlink",
      "options"
    ];
    var defaultFilename = "Untitled";
    var defaultPageSize = 200;
    var noopPageReducer = /* @__PURE__ */ __name(() => void 0, "noopPageReducer");
    var WebClientEvent;
    (function(WebClientEvent2) {
      WebClientEvent2["RATE_LIMITED"] = "rate_limited";
    })(WebClientEvent || (exports.WebClientEvent = WebClientEvent = {}));
    var WebClient = class _WebClient extends methods_1.Methods {
      static {
        __name(this, "WebClient");
      }
      /**
       * @param token - An API token to authenticate/authorize with Slack (usually start with `xoxp`, `xoxb`)
       * @param {Object} [webClientOptions] - Configuration options.
       * @param {Function} [webClientOptions.requestInterceptor] - An interceptor to mutate outgoing requests. See {@link https://axios-http.com/docs/interceptors Axios interceptors}
       * @param {Function} [webClientOptions.adapter] - An adapter to allow custom handling of requests. Useful if you would like to use a pre-configured http client. See {@link https://github.com/axios/axios/blob/v1.x/README.md?plain=1#L586 Axios adapter}
       */
      constructor(token, { slackApiUrl = "https://slack.com/api/", logger = void 0, logLevel = void 0, maxRequestConcurrency = 100, retryConfig = retry_policies_1.tenRetriesInAboutThirtyMinutes, agent = void 0, tls = void 0, timeout = 0, rejectRateLimitedCalls = false, headers = {}, teamId = void 0, allowAbsoluteUrls = true, attachOriginalToWebAPIRequestError = true, requestInterceptor = void 0, adapter = void 0 } = {}) {
        super();
        this.token = token;
        this.slackApiUrl = slackApiUrl;
        if (!this.slackApiUrl.endsWith("/")) {
          this.slackApiUrl += "/";
        }
        this.retryConfig = retryConfig;
        this.requestQueue = new p_queue_1.default({ concurrency: maxRequestConcurrency });
        this.tlsConfig = tls !== void 0 ? tls : {};
        this.rejectRateLimitedCalls = rejectRateLimitedCalls;
        this.teamId = teamId;
        this.allowAbsoluteUrls = allowAbsoluteUrls;
        this.attachOriginalToWebAPIRequestError = attachOriginalToWebAPIRequestError;
        if (typeof logger !== "undefined") {
          this.logger = logger;
          if (typeof logLevel !== "undefined") {
            this.logger.debug("The logLevel given to WebClient was ignored as you also gave logger");
          }
        } else {
          this.logger = (0, logger_1.getLogger)(_WebClient.loggerName, logLevel !== null && logLevel !== void 0 ? logLevel : logger_1.LogLevel.INFO, logger);
        }
        if (this.token && !headers.Authorization)
          headers.Authorization = `Bearer ${this.token}`;
        this.axios = axios_1.default.create({
          adapter: adapter ? (config) => adapter(Object.assign(Object.assign({}, config), { adapter: void 0 })) : void 0,
          timeout,
          baseURL: this.slackApiUrl,
          headers: (0, is_electron_1.default)() ? headers : Object.assign({ "User-Agent": (0, instrument_1.getUserAgent)() }, headers),
          httpAgent: agent,
          httpsAgent: agent,
          validateStatus: /* @__PURE__ */ __name(() => true, "validateStatus"),
          // all HTTP status codes should result in a resolved promise (as opposed to only 2xx)
          maxRedirects: 0,
          // disabling axios' automatic proxy support:
          // axios would read from envvars to configure a proxy automatically, but it doesn't support TLS destinations.
          // for compatibility with https://api.slack.com, and for a larger set of possible proxies (SOCKS or other
          // protocols), users of this package should use the `agent` option to configure a proxy.
          proxy: false
        });
        this.axios.defaults.headers.post["Content-Type"] = void 0;
        if (requestInterceptor) {
          this.axios.interceptors.request.use(requestInterceptor, null);
        }
        this.axios.interceptors.request.use(this.serializeApiCallData.bind(this), null);
        this.logger.debug("initialized");
      }
      /**
       * Generic method for calling a Web API method
       * @param method - the Web API method to call {@link https://docs.slack.dev/reference/methods}
       * @param options - options
       */
      apiCall(method_1) {
        return __awaiter(this, arguments, void 0, function* (method, options = {}) {
          this.logger.debug(`apiCall('${method}') start`);
          warnDeprecations(method, this.logger);
          warnIfFallbackIsMissing(method, this.logger, options);
          warnIfThreadTsIsNotString(method, this.logger, options);
          if (typeof options === "string" || typeof options === "number" || typeof options === "boolean") {
            throw new TypeError(`Expected an options argument but instead received a ${typeof options}`);
          }
          (0, file_upload_1.warnIfNotUsingFilesUploadV2)(method, this.logger);
          if (method === "files.uploadV2")
            return this.filesUploadV2(options);
          const headers = {};
          if (options.token)
            headers.Authorization = `Bearer ${options.token}`;
          const url = this.deriveRequestUrl(method);
          const response = yield this.makeRequest(url, Object.assign({ team_id: this.teamId }, options), headers);
          const result = yield this.buildResult(response);
          this.logger.debug(`http request result: ${JSON.stringify(result)}`);
          if (result.response_metadata !== void 0 && result.response_metadata.warnings !== void 0) {
            result.response_metadata.warnings.forEach(this.logger.warn.bind(this.logger));
          }
          if (result.response_metadata !== void 0 && result.response_metadata.messages !== void 0) {
            for (const msg of result.response_metadata.messages) {
              const errReg = /\[ERROR\](.*)/;
              const warnReg = /\[WARN\](.*)/;
              if (errReg.test(msg)) {
                const errMatch = msg.match(errReg);
                if (errMatch != null) {
                  this.logger.error(errMatch[1].trim());
                }
              } else if (warnReg.test(msg)) {
                const warnMatch = msg.match(warnReg);
                if (warnMatch != null) {
                  this.logger.warn(warnMatch[1].trim());
                }
              }
            }
          }
          if (!result.ok && response.headers["content-type"] !== "application/gzip") {
            throw (0, errors_1.platformErrorFromResult)(result);
          }
          if ("ok" in result && result.ok === false) {
            throw (0, errors_1.platformErrorFromResult)(result);
          }
          this.logger.debug(`apiCall('${method}') end`);
          return result;
        });
      }
      paginate(method, options, shouldStop, reduce) {
        const pageSize = (() => {
          if (options !== void 0 && typeof options.limit === "number") {
            const { limit } = options;
            options.limit = void 0;
            return limit;
          }
          return defaultPageSize;
        })();
        function generatePages() {
          return __asyncGenerator(this, arguments, /* @__PURE__ */ __name(function* generatePages_1() {
            let result;
            let paginationOptions = {
              limit: pageSize
            };
            if (options !== void 0 && options.cursor !== void 0) {
              paginationOptions.cursor = options.cursor;
            }
            while (result === void 0 || paginationOptions !== void 0) {
              result = yield __await(this.apiCall(method, Object.assign(options !== void 0 ? options : {}, paginationOptions)));
              yield yield __await(result);
              paginationOptions = paginationOptionsForNextPage(result, pageSize);
            }
          }, "generatePages_1"));
        }
        __name(generatePages, "generatePages");
        if (shouldStop === void 0) {
          return generatePages.call(this);
        }
        const pageReducer = reduce !== void 0 ? reduce : noopPageReducer;
        let index = 0;
        return (() => __awaiter(this, void 0, void 0, function* () {
          var _a, e_1, _b, _c;
          const pageIterator = generatePages.call(this);
          const firstIteratorResult = yield pageIterator.next(void 0);
          const firstPage = firstIteratorResult.value;
          let accumulator = pageReducer(void 0, firstPage, index);
          index += 1;
          if (shouldStop(firstPage)) {
            return accumulator;
          }
          try {
            for (var _d = true, pageIterator_1 = __asyncValues(pageIterator), pageIterator_1_1; pageIterator_1_1 = yield pageIterator_1.next(), _a = pageIterator_1_1.done, !_a; _d = true) {
              _c = pageIterator_1_1.value;
              _d = false;
              const page = _c;
              accumulator = pageReducer(accumulator, page, index);
              if (shouldStop(page)) {
                return accumulator;
              }
              index += 1;
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (!_d && !_a && (_b = pageIterator_1.return)) yield _b.call(pageIterator_1);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
          return accumulator;
        }))();
      }
      /**
       * Stream markdown text into a conversation.
       *
       * @description The "chatStream" method starts a new chat stream in a conversation that can be appended to. After appending an entire message, the stream can be stopped with concluding arguments such as "blocks" for gathering feedback.
       *
       * The "markdown_text" content is appended to a buffer before being sent to the recipient, with a default buffer size of "256" characters. Setting the "buffer_size" value to a smaller number sends more frequent updates for the same amount of characters, but might reach rate limits more often.
       *
       * @example
       * const streamer = client.chatStream({
       *   channel: "C0123456789",
       *   thread_ts: "1700000001.123456",
       *   recipient_team_id: "T0123456789",
       *   recipient_user_id: "U0123456789",
       * });
       * await streamer.append({
       *   markdown_text: "**hello wo",
       * });
       * await streamer.append({
       *   markdown_text: "rld!**",
       * });
       * await streamer.stop();
       *
       * @see {@link https://docs.slack.dev/reference/methods/chat.startStream}
       * @see {@link https://docs.slack.dev/reference/methods/chat.appendStream}
       * @see {@link https://docs.slack.dev/reference/methods/chat.stopStream}
       */
      chatStream(params) {
        const { buffer_size } = params, args = __rest(params, ["buffer_size"]);
        const options = {
          buffer_size
        };
        return new chat_stream_1.ChatStreamer(this, this.logger, args, options);
      }
      /**
       * This wrapper method provides an easy way to upload files using the following endpoints:
       *
       * **#1**: For each file submitted with this method, submit filenames
       * and file metadata to {@link https://docs.slack.dev/reference/methods/files.getuploadurlexternal files.getUploadURLExternal} to request a URL to
       * which to send the file data to and an id for the file
       *
       * **#2**: for each returned file `upload_url`, upload corresponding file to
       * URLs returned from step 1 (e.g. https://files.slack.com/upload/v1/...\")
       *
       * **#3**: Complete uploads {@link https://docs.slack.dev/reference/methods/files.completeuploadexternal files.completeUploadExternal}
       * @param options
       */
      filesUploadV2(options) {
        return __awaiter(this, void 0, void 0, function* () {
          this.logger.debug("files.uploadV2() start");
          const fileUploads = yield this.getAllFileUploads(options);
          const fileUploadsURLRes = yield this.fetchAllUploadURLExternal(fileUploads);
          fileUploadsURLRes.forEach((res, idx) => {
            fileUploads[idx].upload_url = res.upload_url;
            fileUploads[idx].file_id = res.file_id;
          });
          yield this.postFileUploadsToExternalURL(fileUploads, options);
          const completion = yield this.completeFileUploads(fileUploads);
          return { ok: true, files: completion };
        });
      }
      /**
       * For each file submitted with this method, submits filenames
       * and file metadata to files.getUploadURLExternal to request a URL to
       * which to send the file data to and an id for the file
       * @param fileUploads
       */
      fetchAllUploadURLExternal(fileUploads) {
        return __awaiter(this, void 0, void 0, function* () {
          return Promise.all(fileUploads.map((upload) => {
            const options = {
              filename: upload.filename,
              length: upload.length,
              alt_text: upload.alt_text,
              snippet_type: upload.snippet_type
            };
            if ("token" in upload) {
              options.token = upload.token;
            }
            return this.files.getUploadURLExternal(options);
          }));
        });
      }
      /**
       * Complete uploads.
       * @param fileUploads
       * @returns
       */
      completeFileUploads(fileUploads) {
        return __awaiter(this, void 0, void 0, function* () {
          const toComplete = Object.values((0, file_upload_1.getAllFileUploadsToComplete)(fileUploads));
          return Promise.all(toComplete.map((job) => this.files.completeUploadExternal(job)));
        });
      }
      /**
       * for each returned file upload URL, upload corresponding file
       * @param fileUploads
       * @returns
       */
      postFileUploadsToExternalURL(fileUploads, options) {
        return __awaiter(this, void 0, void 0, function* () {
          return Promise.all(fileUploads.map((upload) => __awaiter(this, void 0, void 0, function* () {
            const { upload_url, file_id, filename, data } = upload;
            const body = data;
            if (upload_url) {
              const headers = {};
              if (options.token)
                headers.Authorization = `Bearer ${options.token}`;
              const uploadRes = yield this.makeRequest(upload_url, {
                body
              }, headers);
              if (uploadRes.status !== 200) {
                return Promise.reject(Error(`Failed to upload file (id:${file_id}, filename: ${filename})`));
              }
              const returnData = { ok: true, body: uploadRes.data };
              return Promise.resolve(returnData);
            }
            return Promise.reject(Error(`No upload url found for file (id: ${file_id}, filename: ${filename}`));
          })));
        });
      }
      /**
       * @param options All file uploads arguments
       * @returns An array of file upload entries
       */
      getAllFileUploads(options) {
        return __awaiter(this, void 0, void 0, function* () {
          let fileUploads = [];
          if ("file" in options || "content" in options) {
            fileUploads.push(yield (0, file_upload_1.getFileUploadJob)(options, this.logger));
          }
          if ("file_uploads" in options) {
            fileUploads = fileUploads.concat(yield (0, file_upload_1.getMultipleFileUploadJobs)(options, this.logger));
          }
          return fileUploads;
        });
      }
      /**
       * Low-level function to make a single API request. handles queuing, retries, and http-level errors
       */
      makeRequest(url_1, body_1) {
        return __awaiter(this, arguments, void 0, function* (url, body, headers = {}) {
          const task = /* @__PURE__ */ __name(() => this.requestQueue.add(() => __awaiter(this, void 0, void 0, function* () {
            try {
              const config = Object.assign({ headers }, this.tlsConfig);
              if (url.endsWith("admin.analytics.getFile")) {
                config.responseType = "arraybuffer";
              }
              if (url.endsWith("apps.event.authorizations.list")) {
                body.token = void 0;
              }
              this.logger.debug(`http request url: ${url}`);
              this.logger.debug(`http request body: ${JSON.stringify(redact(body))}`);
              let allHeaders = Object.keys(this.axios.defaults.headers).reduce((acc, cur) => {
                if (!axiosHeaderPropsToIgnore.includes(cur)) {
                  acc[cur] = this.axios.defaults.headers[cur];
                }
                return acc;
              }, {});
              allHeaders = Object.assign(Object.assign(Object.assign({}, this.axios.defaults.headers.common), allHeaders), headers);
              this.logger.debug(`http request headers: ${JSON.stringify(redact(allHeaders))}`);
              const response = yield this.axios.post(url, body, config);
              this.logger.debug("http response received");
              if (response.status === 429) {
                const retrySec = parseRetryHeaders(response);
                if (retrySec !== void 0) {
                  this.emit(WebClientEvent.RATE_LIMITED, retrySec, { url, body });
                  if (this.rejectRateLimitedCalls) {
                    throw new p_retry_1.AbortError((0, errors_1.rateLimitedErrorWithDelay)(retrySec));
                  }
                  this.logger.info(`API Call failed due to rate limiting. Will retry in ${retrySec} seconds.`);
                  this.requestQueue.pause();
                  yield (0, helpers_1.default)(retrySec * 1e3);
                  this.requestQueue.start();
                  throw new Error(`A rate limit was exceeded (url: ${url}, retry-after: ${retrySec})`);
                }
                throw new p_retry_1.AbortError(new Error(`Retry header did not contain a valid timeout (url: ${url}, retry-after header: ${response.headers["retry-after"]})`));
              }
              if (response.status !== 200) {
                throw (0, errors_1.httpErrorFromResponse)(response);
              }
              return response;
            } catch (error) {
              const e = error;
              this.logger.warn("http request failed", e.message);
              if (e.request) {
                throw (0, errors_1.requestErrorWithOriginal)(e, this.attachOriginalToWebAPIRequestError);
              }
              throw error;
            }
          })), "task");
          return (0, p_retry_1.default)(task, this.retryConfig);
        });
      }
      /**
       * Get the complete request URL for the provided URL.
       * @param url - The resource to POST to. Either a Slack API method or absolute URL.
       */
      deriveRequestUrl(url) {
        const isAbsoluteURL = url.startsWith("https://") || url.startsWith("http://");
        if (isAbsoluteURL && this.allowAbsoluteUrls) {
          return url;
        }
        return `${this.axios.getUri() + url}`;
      }
      /**
       * Transforms options (a simple key-value object) into an acceptable value for a body. This can be either
       * a string, used when posting with a content-type of url-encoded. Or, it can be a readable stream, used
       * when the options contain a binary (a stream or a buffer) and the upload should be done with content-type
       * multipart/form-data.
       * @param config - The Axios request configuration object
       */
      serializeApiCallData(config) {
        const { data, headers } = config;
        let containsBinaryData = false;
        const flattened = Object.entries(data).map(([key, value]) => {
          if (value === void 0 || value === null) {
            return [];
          }
          let serializedValue = value;
          if (Buffer.isBuffer(value) || (0, is_stream_1.default)(value)) {
            containsBinaryData = true;
          } else if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            serializedValue = JSON.stringify(value);
          }
          return [key, serializedValue];
        });
        if (containsBinaryData) {
          this.logger.debug("Request arguments contain binary data");
          const form = flattened.reduce((frm, [key, value]) => {
            if (Buffer.isBuffer(value) || (0, is_stream_1.default)(value)) {
              const opts = {};
              opts.filename = (() => {
                const streamOrBuffer = value;
                if (typeof streamOrBuffer.name === "string") {
                  return (0, node_path_1.basename)(streamOrBuffer.name);
                }
                if (typeof streamOrBuffer.path === "string") {
                  return (0, node_path_1.basename)(streamOrBuffer.path);
                }
                return defaultFilename;
              })();
              frm.append(key, value, opts);
            } else if (key !== void 0 && value !== void 0) {
              frm.append(key, value);
            }
            return frm;
          }, new form_data_1.default());
          if (headers) {
            for (const [header, value] of Object.entries(form.getHeaders())) {
              headers[header] = value;
            }
          }
          config.data = form;
          config.headers = headers;
          return config;
        }
        if (headers)
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        const initialValue = {};
        config.data = (0, node_querystring_1.stringify)(flattened.reduce((accumulator, [key, value]) => {
          if (key !== void 0 && value !== void 0) {
            accumulator[key] = value;
          }
          return accumulator;
        }, initialValue));
        config.headers = headers;
        return config;
      }
      /**
       * Processes an HTTP response into a WebAPICallResult by performing JSON parsing on the body and merging relevant
       * HTTP headers into the object.
       * @param response - an http response
       */
      buildResult(response) {
        return __awaiter(this, void 0, void 0, function* () {
          let { data } = response;
          const isGzipResponse = response.headers["content-type"] === "application/gzip";
          if (isGzipResponse) {
            try {
              const unzippedData = yield new Promise((resolve, reject) => {
                node_zlib_1.default.unzip(data, (err, buf) => {
                  if (err) {
                    return reject(err);
                  }
                  return resolve(buf.toString().split("\n"));
                });
              }).then((res) => res).catch((err) => {
                throw err;
              });
              const fileData = [];
              if (Array.isArray(unzippedData)) {
                for (const dataset of unzippedData) {
                  if (dataset && dataset.length > 0) {
                    fileData.push(JSON.parse(dataset));
                  }
                }
              }
              data = { file_data: fileData };
            } catch (err) {
              data = { ok: false, error: err };
            }
          } else if (!isGzipResponse && response.request.path === "/api/admin.analytics.getFile") {
            data = JSON.parse(new node_util_1.TextDecoder().decode(data));
          }
          if (typeof data === "string") {
            try {
              data = JSON.parse(data);
            } catch (_) {
              data = { ok: false, error: data };
            }
          }
          if (data.response_metadata === void 0) {
            data.response_metadata = {};
          }
          if (response.headers["x-oauth-scopes"] !== void 0) {
            data.response_metadata.scopes = response.headers["x-oauth-scopes"].trim().split(/\s*,\s*/);
          }
          if (response.headers["x-accepted-oauth-scopes"] !== void 0) {
            data.response_metadata.acceptedScopes = response.headers["x-accepted-oauth-scopes"].trim().split(/\s*,\s*/);
          }
          const retrySec = parseRetryHeaders(response);
          if (retrySec !== void 0) {
            data.response_metadata.retryAfter = retrySec;
          }
          return data;
        });
      }
    };
    exports.WebClient = WebClient;
    WebClient.loggerName = "WebClient";
    exports.default = WebClient;
    function paginationOptionsForNextPage(previousResult, pageSize) {
      if (previousResult !== void 0 && previousResult.response_metadata !== void 0 && previousResult.response_metadata.next_cursor !== void 0 && previousResult.response_metadata.next_cursor !== "") {
        return {
          limit: pageSize,
          cursor: previousResult.response_metadata.next_cursor
        };
      }
      return void 0;
    }
    __name(paginationOptionsForNextPage, "paginationOptionsForNextPage");
    function parseRetryHeaders(response) {
      if (response.headers["retry-after"] !== void 0) {
        const retryAfter = Number.parseInt(response.headers["retry-after"], 10);
        if (!Number.isNaN(retryAfter)) {
          return retryAfter;
        }
      }
      return void 0;
    }
    __name(parseRetryHeaders, "parseRetryHeaders");
    function warnDeprecations(method, logger) {
      const deprecatedMethods = ["workflows.stepCompleted", "workflows.stepFailed", "workflows.updateStep"];
      const isDeprecated = deprecatedMethods.some((depMethod) => {
        const re = new RegExp(`^${depMethod}`);
        return re.test(method);
      });
      if (isDeprecated) {
        logger.warn(`${method} is deprecated. Please check on https://docs.slack.dev/reference/methods for an alternative.`);
      }
    }
    __name(warnDeprecations, "warnDeprecations");
    function warnIfFallbackIsMissing(method, logger, options) {
      const targetMethods = ["chat.postEphemeral", "chat.postMessage", "chat.scheduleMessage"];
      const isTargetMethod = targetMethods.includes(method);
      const hasAttachments = /* @__PURE__ */ __name((args) => Array.isArray(args.attachments) && args.attachments.length, "hasAttachments");
      const missingAttachmentFallbackDetected = /* @__PURE__ */ __name((args) => Array.isArray(args.attachments) && args.attachments.some((attachment) => !attachment.fallback || attachment.fallback.trim() === ""), "missingAttachmentFallbackDetected");
      const isEmptyText = /* @__PURE__ */ __name((args) => (args.text === void 0 || args.text === null || args.text === "") && (args.markdown_text === void 0 || args.markdown === null || args.markdown_text === ""), "isEmptyText");
      const buildMissingTextWarning = /* @__PURE__ */ __name(() => `The top-level \`text\` argument is missing in the request payload for a ${method} call - It's a best practice to always provide a \`text\` argument when posting a message. The \`text\` is used in places where the content cannot be rendered such as: system push notifications, assistive technology such as screen readers, etc.`, "buildMissingTextWarning");
      const buildMissingFallbackWarning = /* @__PURE__ */ __name(() => `Additionally, the attachment-level \`fallback\` argument is missing in the request payload for a ${method} call - To avoid this warning, it is recommended to always provide a top-level \`text\` argument when posting a message. Alternatively, you can provide an attachment-level \`fallback\` argument, though this is now considered a legacy field (see https://docs.slack.dev/legacy/legacy-messaging/legacy-secondary-message-attachments for more details).`, "buildMissingFallbackWarning");
      if (isTargetMethod && typeof options === "object") {
        if (hasAttachments(options)) {
          if (missingAttachmentFallbackDetected(options) && isEmptyText(options)) {
            logger.warn(buildMissingTextWarning());
            logger.warn(buildMissingFallbackWarning());
          }
        } else if (isEmptyText(options)) {
          logger.warn(buildMissingTextWarning());
        }
      }
    }
    __name(warnIfFallbackIsMissing, "warnIfFallbackIsMissing");
    function warnIfThreadTsIsNotString(method, logger, options) {
      const targetMethods = ["chat.postEphemeral", "chat.postMessage", "chat.scheduleMessage", "files.upload"];
      const isTargetMethod = targetMethods.includes(method);
      if (isTargetMethod && (options === null || options === void 0 ? void 0 : options.thread_ts) !== void 0 && typeof (options === null || options === void 0 ? void 0 : options.thread_ts) !== "string") {
        logger.warn(buildThreadTsWarningMessage(method));
      }
    }
    __name(warnIfThreadTsIsNotString, "warnIfThreadTsIsNotString");
    function buildThreadTsWarningMessage(method) {
      return `The given thread_ts value in the request payload for a ${method} call is a float value. We highly recommend using a string value instead.`;
    }
    __name(buildThreadTsWarningMessage, "buildThreadTsWarningMessage");
    function redact(body) {
      const flattened = Object.entries(body).map(([key, value]) => {
        if (value === void 0 || value === null) {
          return [];
        }
        let serializedValue = value;
        if (key.match(/.*token.*/) !== null || key.match(/[Aa]uthorization/)) {
          serializedValue = "[[REDACTED]]";
        }
        if (Buffer.isBuffer(value) || (0, is_stream_1.default)(value)) {
          serializedValue = "[[BINARY VALUE OMITTED]]";
        } else if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
          serializedValue = JSON.stringify(value);
        }
        return [key, serializedValue];
      });
      const initialValue = {};
      return flattened.reduce((accumulator, [key, value]) => {
        if (key !== void 0 && value !== void 0) {
          accumulator[key] = value;
        }
        return accumulator;
      }, initialValue);
    }
    __name(redact, "redact");
  }
});

// node_modules/@slack/web-api/dist/index.js
var require_dist4 = __commonJS({
  "node_modules/@slack/web-api/dist/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: /* @__PURE__ */ __name(function() {
          return m[k];
        }, "get") };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebClientEvent = exports.WebClient = exports.ChatStreamer = exports.retryPolicies = exports.LogLevel = exports.addAppMetadata = exports.ErrorCode = void 0;
    var errors_1 = require_errors();
    Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return errors_1.ErrorCode;
    }, "get") });
    var instrument_1 = require_instrument();
    Object.defineProperty(exports, "addAppMetadata", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return instrument_1.addAppMetadata;
    }, "get") });
    var logger_1 = require_logger();
    Object.defineProperty(exports, "LogLevel", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return logger_1.LogLevel;
    }, "get") });
    var retry_policies_1 = require_retry_policies();
    Object.defineProperty(exports, "retryPolicies", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return __importDefault(retry_policies_1).default;
    }, "get") });
    __exportStar(require_request(), exports);
    __exportStar(require_response(), exports);
    var chat_stream_1 = require_chat_stream();
    Object.defineProperty(exports, "ChatStreamer", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return chat_stream_1.ChatStreamer;
    }, "get") });
    var WebClient_1 = require_WebClient();
    Object.defineProperty(exports, "WebClient", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return WebClient_1.WebClient;
    }, "get") });
    Object.defineProperty(exports, "WebClientEvent", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return WebClient_1.WebClientEvent;
    }, "get") });
    __exportStar(require_methods(), exports);
  }
});

export {
  require_dist4 as require_dist
};
/*! Bundled license information:

axios/dist/node/axios.cjs:
  (*! Axios v1.13.5 Copyright (c) 2026 Matt Zabriskie and contributors *)
*/
//# sourceMappingURL=chunk-I7EJTL45.mjs.map
