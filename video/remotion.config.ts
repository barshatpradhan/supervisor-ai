import path from 'node:path'
import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind-v4'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)

Config.overrideWebpackConfig((current) => {
  const config = enableTailwind(current)
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias as Record<string, string> | undefined),
        // The app's components live in ../frontend and would otherwise load a second React from
        // frontend/node_modules; one copy is required for hooks.
        react: path.resolve('node_modules/react'),
        'react-dom': path.resolve('node_modules/react-dom'),
        // Shared with the app's components (one router context, one icon set).
        'react-router-dom$': path.resolve('../frontend/node_modules/react-router-dom'),
        'react-router$': path.resolve('../frontend/node_modules/react-router'),
        'lucide-react$': path.resolve('../frontend/node_modules/lucide-react'),
      },
    },
  }
})
