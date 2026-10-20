# zenmoney-typescript

Independent TypeScript SDK for the public ZenMoney API, intended for Node.js,
browsers, and Chrome extension service workers.

**Status: design and implementation plan only. No SDK is implemented or published.**
The repository/package name is proposed; npm availability and ownership are not
confirmed. There is no configured remote or publication workflow yet.

## Start here

1. [Design and scope](docs/design.md)
2. [Implementation stages and acceptance gates](docs/implementation-plan.md)
3. [Python feature parity](docs/parity.md)
4. [TypeScript API and exact-number contract](docs/api.md)
5. [Shared cross-language contracts](docs/contracts.md)
6. [Testing and security](docs/testing.md)
7. [Publication checklist](docs/publication.md)
8. [Later standalone-extension integration](docs/extension-boundary.md)
9. [Progress and decisions](docs/status.md)
10. [Evidence and documentation sources](docs/sources.md)

The selected approach is an idiomatic asynchronous TypeScript API with the same
public protocol functionality as zenmoney-python 0.7.0. Shared, independently
reviewed protocol examples will check both implementations. This is not a literal
translation and is not a browser database or a bank connector.

All automated acceptance uses synthetic data and a local mock API. Real writes,
pushes, tags, GitHub Releases, and npm publishing require separate authorization.

License: MIT. Documentation, examples, source comments, and errors are English.
