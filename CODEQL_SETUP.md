# CodeQL Setup Instructions

## Issue Resolution

This repository contains an advanced CodeQL configuration workflow that conflicts with GitHub's default CodeQL setup.

### Error Message
```
Error: Code Scanning could not process the submitted SARIF file:
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled
```

### Solution

To resolve this conflict, you must disable CodeQL default setup in the repository settings:

1. Go to repository **Settings** → **Code security and analysis**
2. Find the **Code scanning** section
3. Next to **CodeQL analysis**, click the dropdown menu and select **Disable CodeQL**
4. The advanced workflow in `.github/workflows/codeql.yml` will then run successfully

### Advanced Configuration Benefits

The advanced configuration provides:

- **Enhanced Security Queries**: Includes `security-extended` and `security-and-quality` query suites
- **Multiple Language Support**: Configured for JavaScript/TypeScript and GitHub Actions
- **Optimized Performance**: Proper timeout settings and build modes
- **Scheduled Scans**: Weekly security scans on Thursdays
- **Comprehensive Coverage**: Analyzes both code and workflow files

### Configuration Details

- **Languages**: JavaScript/TypeScript, GitHub Actions
- **Query Suites**: security-extended, security-and-quality
- **Schedule**: Weekly on Thursdays at 5:39 AM UTC
- **Triggers**: Push to main, pull requests to main, scheduled runs
- **Timeouts**: 6 hours for most languages, 2 hours for Swift

### Next Steps

1. Disable default CodeQL setup in repository settings
2. Merge this PR to enable the advanced configuration
3. Monitor the **Security** tab for code scanning results