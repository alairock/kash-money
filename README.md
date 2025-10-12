# Kash Money - Budget Management App

A modern budget management application built with React, TypeScript, Tailwind CSS, and Firebase.

## Features

- 📊 **Budget Management**: Create and manage multiple budgets with starting amounts
- 💰 **Line Items**: Track income and expenses with automatic, complete, and incomplete statuses
- 🔄 **Recurring Expenses**: Set up recurring bills that automatically populate new budgets
- 🎯 **Smart Totals**: Calculate unmarked and final totals automatically
- 🎨 **Visual Feedback**: Color-coded rows (green for credits, red for incomplete negatives)
- ↕️ **Drag & Drop Reordering**: Easily reorder budget items and recurring expenses
- 📱 **Inline Editing**: Edit amounts and statuses directly in the table
- ☁️ **Cloud Sync**: Data backed by Firebase Firestore for reliability and sync across devices

## Tech Stack

- **Frontend**: React 19.1.1, TypeScript 5.8.3
- **Styling**: Tailwind CSS 4.1.12
- **Routing**: React Router 6.18.0
- **Backend**: Firebase (Firestore Database)
- **Build Tool**: Vite 7.1.4
- **Linting**: ESLint with React plugins
- **Code Formatting**: Prettier

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- A Firebase account

### Installation

1. Clone the repository:
```sh
git clone <your-repo-url>
cd change
```

2. Install dependencies:
```sh
npm install
```

3. Set up Firebase:
   - Follow the complete setup guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
   - Create a `.env` file with your Firebase credentials (see `.env.example`)

4. Run the development server:
```sh
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Firebase Setup

This app requires Firebase Firestore to store your budget data. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed setup instructions.

**Quick Setup:**
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Copy your config to `.env`
4. Run the app!

## Project Structure

```
src/
├── components/     # Reusable React components
│   └── Nav.tsx    # Navigation bar
├── config/        # Configuration files
│   └── firebase.ts # Firebase initialization
├── pages/         # Page components
│   ├── Budgets.tsx      # Budget list and creation
│   ├── BudgetView.tsx   # Individual budget detail view
│   ├── Config.tsx       # Recurring expenses configuration
│   └── NotFound.tsx     # 404 page
├── styles/        # Global styles
│   └── global.css
├── types/         # TypeScript type definitions
│   └── budget.ts
├── utils/         # Utility functions
│   ├── storage.ts           # Firebase Firestore operations
│   └── localStorageBackup.ts # Old localStorage implementation (backup)
└── App.tsx        # Main app component with routing
```

## Usage

### Creating a Budget

1. Navigate to the Budgets page
2. Click "Create New Budget"
3. Enter a name (or leave blank for auto-date) and starting amount
4. Recurring expenses are automatically added as line items

### Managing Line Items

- **Inline Edit**: Click on status or amount to edit
- **Full Edit**: Click "Edit" button to modify all fields
- **Reorder**: Drag items by the handle icon (⋮⋮)
- **Visual States**:
  - 🟢 Green background = Credit (positive amount)
  - 🔴 Red background = Incomplete negative expense
  - 🌫️ Dimmed = Automatic, complete, or zero amount

### Recurring Expenses

Configure your recurring bills in the Config page. These automatically populate new budgets with smart default statuses:
- Zero amount → Complete
- Automatic flag → Automatic status
- Otherwise → Incomplete

## Scripts

```sh
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Contributing

Feel free to dive in! [Open an issue](https://github.com/alairock/kash-money/issues/new) or submit PRs.

## License

See LICENSE file for details.

## Introduction

A starter [Vite](https://vitejs.dev/) template having:

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- Multiple [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) plugins installed

> [!IMPORTANT]
>
> The latest code of this template has updated Vite to version 7.0+, which requires [Node.js](https://nodejs.org/) version 20.19+ or 22.12+. Please upgrade if your package manager warns about it. Or you can use [this release](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/releases/tag/release-2025.03.27) which is vite@5 and works with Node.js 18 or 20.
>
> 该模板的最新代码中，已经将 Vite 的版本更新到了 7.0+，需要 20.19+ 或 22.12+ 版本的 [Node.js](https://nodejs.org/)。当你的包管理器发出警告时，请注意升级你的 Node.js 版本。如果你需要 vite@5，请使用[这个版本](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/releases/tag/release-2025.03.27)，可兼容 Node.js 18 或 20。

> [!TIP]
>
> This code repository may occasionally update its dependency versions. If the dependency versions in the latest code do not meet your expectations, please go to [Tags](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/tags) section to download a previous version of this template. I will display the dependencies used in each Tag, please choose the one you need.
>
> 这个代码仓库可能会不定期更新其依赖包的版本。如果最新代码中依赖的版本不符合你的期望，请移步[Tags](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/tags)下载之前的模板。每个Tag中使用的依赖都会展示在Tag详情中，请选择你需要的版本。

## Usage

> [!TIP]
>
> The fastest way to use this template is to click the “Use this template” button on the top right of this repository. It will help you create a new repository quickly, and you can make any modifications to your own repository. If you still want to download this template separately, please continue reading.
>
> 使用该模板的最快方式，就是点击本仓库右上角的“使用该模板”按扭。这帮助你使用该模板迅速创建一个新的仓库，然后你可以对自己的仓库进行任何修改。如果你仍然希望单独下载此模板，可继续往下读。

If you need a copy of this repository. You can [download](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/archive/refs/heads/main.zip) a copy as zip but [tiged](https://github.com/tiged/tiged) is recommended.

After you installed tiged, please excute the following commands:

```sh
$ cd path-to-save-your-project
$ tiged royrao2333/template-vite-react-ts-tailwind your-project-name
```

After getting a copy of this repository, you can use your package manager to install dependecies:

```sh
$ cd path-to-your-project
$ pnpm install

# npm install
# yarn install
```

Let's run!

```sh
$ pnpm run dev

# npm run dev
# yarn run dev
```

> We've already implemented some recommended configurations in `eslint.config.mjs`, `prettier.config.mjs`. Feel free to edit them if you have your own preferences.

## Contributing

Feel free to dive in! [Open an issue](https://github.com/RoyRao2333/template-vite-react-ts-tailwind/issues/new) or submit PRs.
