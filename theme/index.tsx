import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { DownloadMenu } from './DownloadMenu';
import { VersionSelect } from './VersionSelect';

const Layout = () => (
  <BasicLayout
    beforeNavMenu={
      <>
        <VersionSelect />
        <DownloadMenu />
      </>
    }
  />
);

export { Layout };
export * from '@rspress/core/theme-original';
