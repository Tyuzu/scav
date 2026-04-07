export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      ".env*",
      ".vite/",
      "coverage/",
      "*.log",
      ".git/"
    ]
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        XMLHttpRequest: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        EventTarget: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        BroadcastChannel: "readonly",
        // Build-time globals
        __DEV__: "readonly",
        __PROD__: "readonly"
      }
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"]
        }
      ],
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "warn",
      "eqeqeq": ["warn", "always"],
      "curly": "warn",
      "brace-style": ["warn", "1tbs"],
      "no-else-return": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error"
    }
  }
];
