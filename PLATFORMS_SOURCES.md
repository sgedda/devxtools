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

11. **Mockifyer** - `platforms: [React Native]`
    - Source: https://github.com/sgedda/mockifyer - README
    - "Usage in React Native / Expo" and "Usage in Node.js" sections present; Web/browser usage not documented in README

12. **Reactotron** - `platforms: [React Native, iOS, Android]`
    - Source: https://github.com/infinitered/reactotron - "A desktop app for inspecting your React JS and React Native projects"
    - Explicitly for React Native apps on iOS and Android

13. **Flipper** - `platforms: [React Native, iOS, Android]`
    - Source: https://fbflipper.com/ - "Extensible mobile app debugger"
    - Supports React Native, iOS, and Android per documentation
    - Note: React Native removed built-in Flipper support in v0.74 (https://github.com/react-native-community/discussions-and-proposals/discussions/641)

14. **Appium** - `platforms: [iOS, Android, React Native, Web]`
    - Source: https://appium.io/ - "Automation for Apps"
    - Homepage: "mobile apps on iOS, Android, and Windows Desktop platforms" and "mobile-web apps"
    - Supports native, hybrid, mobile-web, and desktop apps including React Native

15. **Maestro** - `platforms: [iOS, Android, React Native, Flutter, Web]`
    - Source: https://maestro.mobile.dev/ - "The easiest way to automate UI testing for your mobile app"
    - Documentation shows iOS, Android, React Native, Flutter support
    - Web support is in beta per https://maestro.mobile.dev/platform-support/web

16. **Proxyman** - `platforms: [iOS, Android, Web]`
    - Source: https://proxyman.io/ - "Modern and Delightful HTTP Debugging Proxy"
    - Features page: "Debug iOS, Android, and Web apps" and "Intercept HTTP/HTTPS requests from iOS, Android, and Web apps"

17. **Charles Proxy** - `platforms: [iOS, Android, Web]`
    - Source: https://www.charlesproxy.com/ - "Web Debugging Proxy Application"
    - Works with iOS, Android, and web traffic

### Language-Agnostic / Multi-Platform

18. **Sentry** - `platforms: [Web, iOS, Android, React Native]`
    - Source: https://sentry.io/ - "Application Monitoring and Error Tracking Software"
    - Supports many platforms; YAML lists Web, iOS, Android, React Native as primary mobile/web platforms

Note: Tools without platforms listed are either:
- Language-agnostic with CLI/Desktop/Hosted runtimes (Postman, Bruno, Mockoon, etc.)
- Server-side tools that don't target specific client platforms (WireMock, Prism, etc.)
- Tools where platform data wasn't clearly stated in documentation

All platform assignments are based on official documentation, READMEs, or feature pages from each tool's website.
