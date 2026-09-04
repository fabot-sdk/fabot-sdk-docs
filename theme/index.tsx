import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { VersionSelect } from './VersionSelect';

const Layout = () => <BasicLayout afterNavMenu={<VersionSelect />} />;

export { Layout };
export * from '@rspress/core/theme-original';
