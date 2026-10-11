import './styles.css';
import { GameApp } from './core/GameApp';
const root = document.querySelector<HTMLDivElement>('#app')!;
const app = new GameApp(root);
app.start().catch(error => { root.textContent = `加载失败：${String(error)}。请检查本地素材并刷新。`; console.error(error); });
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
