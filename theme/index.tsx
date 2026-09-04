import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { VersionSelect } from './VersionSelect';

const Layout = () => <BasicLayout beforeNavMenu={<VersionSelect />} />;

export { Layout };
export * from '@rspress/core/theme-original';
