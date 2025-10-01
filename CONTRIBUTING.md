# Contributing to Document Chat System

Thank you for your interest in contributing to Document Chat System! This guide will help you get started.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/document-chat-system.git
   cd document-chat-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/                 # Next.js 14 App Router
│   ├── api/            # API routes
│   ├── documents/      # Document management
│   ├── chat/           # Chat interface
│   └── profile/        # User profiles
├── components/         # React components
│   ├── ui/            # Base UI components
│   ├── documents/     # Document components
│   ├── chat/          # Chat components
│   └── layout/        # Layout components
├── lib/               # Utilities and configs
├── hooks/             # Custom React hooks
├── types/             # TypeScript definitions
└── stores/            # State management
```

## Code Guidelines

### TypeScript
- Use TypeScript for all new code
- Add proper type definitions
- Use Zod for schema validation
- Include JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Follow the existing component patterns
- Use Radix UI primitives when possible
- Ensure accessibility (a11y) compliance

### API Routes
- Add proper error handling
- Include request/response validation
- Add rate limiting where appropriate
- Document with JSDoc comments

### Database
- Use Prisma for database operations
- Follow the existing schema patterns
- Add proper indexes for performance
- Include data validation

## Testing

- Write unit tests for utility functions
- Add integration tests for API routes
- Test components with React Testing Library
- Ensure accessibility compliance

```bash
npm test                # Run unit tests
npm run test:coverage   # Run with coverage
```

## Submitting Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing new feature"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Include screenshots for UI changes

## Commit Message Format

Follow the [Conventional Commits](https://conventionalcommits.org/) format:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## Areas for Contribution

### High Priority
- [ ] Improve documentation and examples
- [ ] Add more file format support
- [ ] Enhance AI provider integrations
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Medium Priority
- [ ] Mobile app companion
- [ ] Additional export formats
- [ ] Advanced search features
- [ ] Team collaboration features
- [ ] Plugin system

### Low Priority
- [ ] Themes and customization
- [ ] Analytics and reporting
- [ ] Advanced admin features
- [ ] API client libraries

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-org/document-chat-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/document-chat-system/discussions)
- **Discord**: [Join our community](https://discord.gg/your-invite)

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to Document Chat System, you agree that your contributions will be licensed under the MIT License.