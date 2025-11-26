# Contributing to @turbodocx/next-plugin-llms

Thank you for your interest in contributing to the TurboDocx Next.js LLM plugin! We welcome contributions from the community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/next-plugin-llms.git
   cd next-plugin-llms
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the project**:
   ```bash
   npm run build
   ```

## Development Workflow

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Building

```bash
# Build TypeScript
npm run build

# Build in watch mode
npm run watch
```

### Testing Locally

You can test your changes in a local Next.js project:

```bash
# In the plugin directory
npm link

# In your Next.js project
npm link @turbodocx/next-plugin-llms
```

## Code Guidelines

- **TypeScript**: All code should be written in TypeScript with proper type annotations
- **Testing**: Add tests for new features and bug fixes
- **Formatting**: Code is formatted with Prettier (configured in the project)
- **Linting**: Follow ESLint rules (if configured)

## Commit Messages

We use conventional commit messages with Claude Code attribution:

```
feat: add new feature

Description of the change

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

## Pull Request Process

1. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes** and commit them with clear messages

3. **Push to your fork**:
   ```bash
   git push origin feat/my-new-feature
   ```

4. **Open a Pull Request** on GitHub with:
   - Clear description of the changes
   - Reference to any related issues
   - Screenshots/examples if applicable

5. **Wait for review** - maintainers will review your PR and may request changes

## Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the problem
- **Reproduction**: Steps to reproduce the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: Next.js version, Node.js version, OS
- **Code samples**: Minimal reproducible example if possible

## Feature Requests

We welcome feature requests! Please:

- Check existing issues first to avoid duplicates
- Describe the use case and why the feature would be useful
- Provide examples of how the feature would be used

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what's best for the project and community
- Accept constructive criticism gracefully

## Questions?

- Open an issue for general questions
- Join our [Discord](https://discord.gg/NYKwz4BcpX) for real-time discussions
- Follow us on [X/Twitter](https://twitter.com/TurboDocx) for updates

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to TurboDocx!** 🚀
