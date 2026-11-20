---
title: 机器人系统配置
status: draft
owner: fabot-core
updated: 2026-11-20
---

# 机器人系统配置

机器人系统的配置决定这台机器装了哪些能力、每个能力接什么硬件、服务怎么启动、网络与日志落在哪里。本页说明配置的存放位置、修改方式、端口与环境变量，以及新机首次开机要做的配置；安装与升级见 [机器人系统安装与升级](./robot-system.md)。

## 配置从哪里改

同一批配置有三种改法，写的都是机器人侧的用户配置：

| 方式 | 适用场景 | 入口 |
|------|----------|------|
| 本地控制台 | 现场配置、首次开机、临时排查 | 浏览器打开 `http://<机器人地址>:8787/`，见 [机器人系统运维与本地控制台](../../usage/testing/robot-system.md) |
| SDK | 从你的应用里批量读写、做自动化 | `robot.configuration` 与各槽位的 `get_config()` / `set_config()` / `edit_config()`，见 [配置管理](../../usage/configuration/configuration.md) |
| 直接编辑 YAML | 批量改、版本管理、导入导出 | `$FABOT_HOME`，默认 `$FABOT_ROOT/data/config/current` |

控制台是推荐入口：它会校验取值范围、把候选值（相机序列号、CAN 接口、串口、运控机型）做成下拉，并在保存前校验整批配置。

## 配置分成两层

| 层级 | 管什么 | 改动的影响 |
|------|--------|------------|
| 整机配置 | 哪个槽位绑哪个能力实现、是否启用、是否必需、部署节点 | 触发对应能力的生命周期迁移 |
| 实体配置域 | 能力 / 技能 / 服务自己的参数（到位阈值、相机流、同步组、运控机型等） | 只影响该实体，多数要重启对应单元生效 |

两层都用 CAS（Compare-And-Swap）提交：提交时带上期望版本，与机器人当前状态冲突时失败。冲突后重新读取、合并、重试即可，细节见 [配置管理](../../usage/configuration/configuration.md)。

整机配置只写绑定关系，不在里面内联硬件参数。改「升降柱用哪个适配器」用整机配置，改「升降柱的丝杠导程」用实体配置域。

## 用户配置目录

`$FABOT_HOME` 指定用户配置根，默认 `$FABOT_ROOT/data/config/current`。目录按实体分类：

```text
data/config/current/
├── robot_spec.yaml                          # 可选：整机身份与坐标系补充
├── robot_config.yaml                        # 可选：服务与能力的接线覆盖
├── environments/fabot_env_ros2/communication.yaml
├── services/fabot_ocs2/launch.yaml
├── services/fabot_obs_collector/obs.yaml
├── services/fabot_ros2/node.yaml
├── slots/lift/config/fabot_lift_leadshine/{can,mechanics}.yaml
├── slots/head_camera/config/fabot_camera_orbbec/{camera,video}.yaml
├── slots/chassis/config/fabot_chassis/{network,motion}.yaml
└── subsystems/motion_control/robot.local.yaml
```

`robot_spec.yaml` / `robot_config.yaml` 是可选的顶层覆盖：文件不存在时用包内默认，存在时只覆盖写到的部分，可分别用 `fabot config show` 查看、`fabot config clean` 删除（会连 `robot_spec.yaml` 一起删）。其余目录按需要生成——某个配置域第一次被绑定时，会从包内模板复制一份到用户目录。

:::note 用户副本不会跟着升级刷新
配置域的用户副本只在首次绑定时从模板复制，升级后不会自动合并新模板。包里删掉或改名的键仍留在文件里，加载时会报 `unexpected config field`，见 [故障排除](../../troubleshooting.md)。需要回到默认值时，用控制台详情页的「恢复默认值」，或删除对应域的文件让它下次重新复制。
:::

## 网络与端口

| 端口 | 用途 | 默认 | 说明 |
|------|------|------|------|
| TCP 7557 | SDK 控制面 | `0.0.0.0:7557` | SDK 与应用侧连接的就是它 |
| TCP 7447 | ROS 2 数据面 | `127.0.0.1:7447` | 只在机器人本机或运控栈内部使用 |
| TCP 8787 | 本地控制台 | `0.0.0.0:8787` | 浏览器访问，端口被占时顺延 |
| TCP 9997 / 8554 / 8889 / 8189 | 多媒体服务 | 各端口的默认值 | 相机预览的 API、RTSP、WebRTC 与 ICE |

- 端口被占用时，实际使用的端口写进 `/run/fabot/ports.env`；`fabot status` 会显示当前端口状态。
- 控制面监听在 `0.0.0.0`，默认**没有访问控制**。只把机器人接在可信网络里，或在网络层限制能访问 7557 的来源。
- 跨主机访问一律用显式端点：SDK 侧写 `Robot.connect("<机器人地址>", 7557)`，不要依赖自动发现跨网段生效。
- `FABOT_ZENOHD_PORT` / `FABOT_RMW_ZENOHD_PORT` 只是**首选**端口：被未知进程占用时系统不退出，而是顺延到空闲端口并写进 `ports.env`。远端 SDK 仍按 7557 连接，所以现场发现端口被改过时，要么腾出 7557，要么让调用方显式指定新端口。

## 环境变量

这些变量作用于机器人主机上的命令与 unit，不是 SDK 客户端的配置：

| 变量 | 默认 | 作用 |
|------|------|------|
| `FABOT_ROOT` | `/opt/fiveages/fabot` | 产品根。安装时写入 systemd 单元，装完再改它不会搬动已有安装 |
| `FABOT_HOME` | `$FABOT_ROOT/data/config/current` | 用户配置根 |
| `OBS_ROOT` | `$FABOT_ROOT/data/obs` | 观测数据根：采集日志、冻结记录、原始日志与数据包 |
| `FABOT_LOG_DIR` | `$OBS_ROOT/raw` | 原始 `stdout` / `stderr` 的落盘目录，仅在 `FABOT_LOG_RAW_FILES` 打开时写 |
| `FABOT_LOG_RAW_FILES` | 关闭 | 打开后额外保留子进程的原始输出 |
| `FABOT_LOG_LEVEL` | `warn` | 日志级别：`debug` / `info` / `warn` / `error`；命令行参数优先 |
| `FABOT_CONSOLE_BIND` | `0.0.0.0:8787` | 控制台监听地址 |
| `FABOT_ZENOHD_PORT` | `7557` | 控制面首选端口 |
| `FABOT_RMW_ZENOHD_PORT` | `7447` | ROS 数据面首选端口 |
| `FABOT_UNIT_NAME` | `fabot.service` | 运维命令操作的服务单元名 |

控制台与服务的启动参数写在 systemd 单元里。改 `FABOT_CONSOLE_BIND` 之类要落到单元上，靠改单元文件而不是只改当前 shell 的环境变量；改完 `systemctl daemon-reload` 并重启对应单元。

## 首次开机配置

新装或换机后，按下面顺序把机器配到可用状态。控制台页面结构见 [机器人系统运维与本地控制台](../../usage/testing/robot-system.md)。

### 1. 确认服务运行

```console
$ fabot status
$ fabot doctor
```

`doctor` 任一项 fail 时先按它给出的命令修复，再看下面的配置。

### 2. 绑定相机

在控制台整机页的**相机设置**里，为每个相机槽位填入序列号：

- 页面上列出本机枚举到的设备，选中的序列号写回该槽位的配置；
- 同一台相机不能绑到两个槽位；
- 清空序列号表示解绑，该槽位不再占用这台 USB 相机；
- 序列号还没填的槽位保留占位值（`REPLACE_` 前缀），适配器不会去占用设备。

### 3. 选机型与运控地址

在控制台 `fabot_ocs2` 服务详情的**运控设置**里选机型并填设备地址：

- 机型决定用哪套运动学描述与预设，可选项来自机器人上已安装的机型目录；
- 臂 IP 按机型显示：单 IP 机型只有一个「臂 IP」，左右各一台控制器的机型显示「左臂 IP」「右臂 IP」，按侧别认边的机型不显示 IP；
- 身体 CAN 接口只在机型描述声明了它时出现，S2 这类写死 `can0` 的机型不显示；
- 末端驱动决定显示串口还是末端 CAN；`usb` / `usb_rs485` 用串口，`usb_can` 用末端 CAN。

保存后要重新启动运控才生效（控制台工具栏的「停止运控」→「启动运控」，或 `fabot motion stop` / `fabot motion start`）。

:::warning CAN 与串口要事先准备好
CAN 接口必须已经由系统拉起，适配器只使用接口、不负责设置波特率。串口建议用 `/dev/serial/by-id/...` 这类固定名字，避免 USB 重新枚举后 `/dev/ttyUSB0` 换了设备。
:::

### 4. 用自检确认

控制台「功能检测」页按能力逐项验证：关节小幅偏转再回位、相机采图与帧率、升降柱升降、底盘前后移动一小段、灯带变色、屏幕与扬声器输出等。

:::warning 功能检测会让机器人动起来
功能检测会驱动关节、末端、升降柱与底盘，并可能翻转 GPIO。确认现场无人、无障碍物后再开始；急停按下时整轮会中止。
:::

## 配置的导出与导入

控制台整机页的工具条里有**导出配置**与**导入配置**：

- 导出按「类别 → 模块 → 配置域」三级勾选，写出一份 YAML，文件名带机器人 id 与日期；
- 导入先选文件，只覆盖文件里勾中的配置域，没勾的保持原值；
- 导出**不含**启用状态、能力绑定、`required` 与部署节点，这些要靠整机配置单独管理；
- 批量写入前会整批校验，某一项失败就停在那里，响应里带已经写上的条目。

同一件事从应用侧做，用 `robot.configuration.get()` / `apply()` 与各槽位的 `edit_config()`，见 [配置管理](../../usage/configuration/configuration.md)。

## 日志与观测

```console
$ fabot logs -f                     # 跟随 fabot.service 的 journal
$ fabot logs --unit fabot_ocs2      # 读某个单元的采集日志
$ fabot obs status                  # 各单元占用、冻结记录与配额
$ fabot obs export                  # 打包指定范围的日志
$ fabot obs clean                   # 清理超过保留期的记录
```

- 采集日志在 `$OBS_ROOT/<unit>/<日期>/log.jsonl`；原始 `stdout` / `stderr` 只在 `FABOT_LOG_RAW_FILES` 打开时才写。
- 不要到 `/var/log/fabot` 或 `/var/lib/fabot` 找产品日志，当前安装形态不用这两个路径。
- 应用侧读同样的数据用 `robot.logs` 与 `robot.obs`，见 [日志、指标与可观测性](../../usage/diagnostics/observability.md)。

## 升级之后

升级会保留用户配置，并在升级前写一份配置快照。升级后留意两件事：

1. **配置项被改名或删除**：日志里出现 `unexpected config field` 时，说明用户副本里还有旧键。删掉对应域文件或用控制台的「恢复默认值」，下次启动会按当前模板重建。
2. **行为异常**：用 `fabot boot rollback` 回到上一版本，配置快照会一起恢复，见 [机器人系统安装与升级](./robot-system.md)。

运行模式、健康度与故障的读取方式在 SDK 侧，见 [状态、故障与生命周期](../../usage/data/status-faults.md)。

## 下一步

- [机器人系统运维与本地控制台](../../usage/testing/robot-system.md)：`fabot` 命令与控制台页面
- [配置管理](../../usage/configuration/configuration.md)：整机绑定与配置域的 SDK 写法
- [平台服务管理](../../usage/configuration/services.md)：服务的启停与配置
- [故障排除](../../troubleshooting.md)：连不上、配置加载失败、运控起不来
