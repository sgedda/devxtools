# Platform Data Sources

This document lists all platforms values added to tool YAMLs and their sources for editorial review.

## Tools with Platforms Added

### Web Platform

1. **MSW** - `platforms: [Web]`
   - Source: https://mswjs.io/ - "Seamless REST/GraphQL API mocking library for browser and Node.js"
   - Browser/Web is a primary runtime per their Service Worker architecture

2. **Playwright** - `platforms: [Web]`
   - Source: https://playwright.dev/ - "Playwright enables reliable end-to-end testing for modern web apps"
   - Explicitly a web browser automation tool

3. **Cypress** - `platforms: [Web]`
   - Source: https://www.cypress.io/ - "Fast, easy and reliable testing for anything that runs in a browser"
   - Web browser testing tool

4. **MirageJS** - `platforms: [Web]`
   - Source: https://miragejs.com/ - "Build, test and demo your JavaScript application without an API"
   - Browser-based mock server

5. **Polly.js** - `platforms: [Web]`
   - Source: https://netflix.github.io/pollyjs/ - "Record, replay, and stub HTTP interactions"
   - Works in both Node.js and browsers, Web is a primary platform

6. **Hoppscotch** - `platforms: [Web]`
   - Source: https://hoppscotch.io/ - "Open source API development ecosystem"
   - Web application (also has desktop versions)

7. **Beeceptor** - `platforms: [Web]`
   - Source: https://beeceptor.com/ - "Mock a rest API in seconds"
   - Web-based hosted service

8. **Mockaroo** - `platforms: [Web]`
   - Source: https://www.mockaroo.com/ - "Mockaroo lets you generate up to 1,000 rows of realistic test data"
   - Web-based hosted service

9. **Postman Mock Servers** - `platforms: [Web]`
   - Source: https://www.postman.com/features/mock-api/ - "Create mock servers to simulate APIs"
   - Hosted web service

### Mobile Platform

10. **Detox** - `platforms: [React Native, iOS, Android]`
    - Source: https://wix.github.io/Detox/ - "Gray box end-to-end testing and automation framework for mobile apps"
    - README explicitly lists React Native, iOS, and Android support

11. **Mockifyer** - `platforms: [React Native, Web]`
    - Source: https://github.com/sgedda/mockifyer - "HTTP mocking and recording for axios and fetch"
    - README: "Supports React Native with device storage sync" and browser usage

12. **Reactotron** - `platforms: [React Native, iOS, Android]`
    - Source: https://github.com/infinitered/reactotron - "A desktop app for inspecting your React JS and React Native projects"
    - Explicitly for React Native apps on iOS and Android

13. **Flipper** - `platforms: [React Native, iOS, Android]`
    - Source: https://fbflipper.com/ - "Extensible mobile app debugger"
    - Supports React Native, iOS, and Android per documentation

14. **Appium** - `platforms: [iOS, Android, React Native]`
    - Source: https://appium.io/ - "Automation for Apps"
    - Supports native, hybrid, and mobile-web apps on iOS and Android, including React Native

15. **Maestro** - `platforms: [iOS, Android, React Native, Flutter, Web]`
    - Source: https://maestro.mobile.dev/ - "The easiest way to automate UI testing for your mobile app"
    - README lists support for iOS, Android, React Native, Flutter, and Web

16. **Proxyman** - `platforms: [iOS, Android]`
    - Source: https://proxyman.io/ - "Modern and Delightful HTTP Debugging Proxy"
    - Features page lists iOS and Android support

17. **Charles Proxy** - `platforms: [iOS, Android, Web]`
    - Source: https://www.charlesproxy.com/ - "Web Debugging Proxy Application"
    - Works with iOS, Android, and web traffic

### Language-Agnostic / Multi-Platform

18. **Sentry** - No specific platforms added (language-agnostic tool)
    - Source: https://sentry.io/ - Error tracking for all platforms
    - Supports web, mobile, desktop - truly multi-platform, so no specific platforms listed

Note: Tools without platforms listed are either:
- Language-agnostic with CLI/Desktop/Hosted runtimes (Postman, Bruno, Mockoon, etc.)
- Server-side tools that don't target specific client platforms (WireMock, Prism, etc.)
- Tools where platform data wasn't clearly stated in documentation

All platform assignments are based on official documentation, READMEs, or feature pages from each tool's website.
