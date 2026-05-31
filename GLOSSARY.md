# Glossary · 英中术语对照

本表服务于 `zh.md` 翻译。`保留` 列标记是否在中文译文里保留英文（首次出现给括注中文，之后直接用英文）。

> 持续追加：subagent 翻译时遇到表里没有的术语，可在结果里建议；orchestrator 汇总后由用户合入此表。

## 基础数学 / ML

| English | 中文 | 保留英文 |
|---|---|:---:|
| vector | 向量 | |
| matrix | 矩阵 | |
| tensor | 张量 | |
| scalar | 标量 | |
| eigenvalue | 特征值 | |
| eigenvector | 特征向量 | |
| gradient | 梯度（保留 gradient 也可） | ✓ |
| Jacobian | 雅可比 | |
| Hessian | 海森 | |
| derivative | 导数 | |
| chain rule | 链式法则 | |
| probability | 概率 | |
| distribution | 分布 | |
| expectation | 期望 | |
| variance | 方差 | |
| entropy | 熵 | |
| KL divergence | KL 散度 | ✓（KL） |
| mutual information | 互信息 | |
| optimization | 优化 | |
| convex | 凸（函数 / 优化） | |
| MLE | 极大似然估计 | ✓ |
| MAP | 最大后验 | ✓ |

## 深度学习核心

| English | 中文 | 保留英文 |
|---|---|:---:|
| neural network | 神经网络 | |
| layer | 层 | |
| neuron | 神经元 | |
| activation function | 激活函数 | |
| ReLU / GELU / SiLU / sigmoid / tanh | 同左 | ✓ |
| MLP | 多层感知机 | ✓ |
| CNN | 卷积神经网络 | ✓ |
| RNN / LSTM / GRU | 同左 | ✓ |
| dropout | dropout | ✓ |
| batch norm / layer norm | 同左 | ✓ |
| weight | 权重 | |
| bias | 偏置 | |
| loss / loss function | 损失 / 损失函数 | |
| logits | logits | ✓ |
| softmax | softmax | ✓ |
| backpropagation | 反向传播 | |
| forward pass | 前向传播 | |
| optimizer / SGD / Adam / AdamW | 同左 | ✓ |
| learning rate | 学习率 | |
| epoch | epoch | ✓ |
| batch / mini-batch | 同左 | ✓ |
| gradient descent | 梯度下降 | |
| overfitting / underfitting | 过拟合 / 欠拟合 | |
| regularization | 正则化 | |
| weight decay | 权重衰减 | |
| momentum | 动量 | |
| checkpoint | checkpoint | ✓ |

## Transformer / LLM

| English | 中文 | 保留英文 |
|---|---|:---:|
| transformer | transformer | ✓ |
| attention / self-attention / cross-attention | 同左 | ✓ |
| multi-head attention | 多头 attention | ✓（attention） |
| attention head | attention head | ✓ |
| KV cache | KV cache | ✓ |
| positional encoding | 位置编码 | |
| RoPE / ALiBi | 同左 | ✓ |
| encoder / decoder | encoder / decoder | ✓ |
| autoregressive | autoregressive | ✓ |
| token / tokenizer | token / tokenizer | ✓ |
| BPE / sentencepiece | 同左 | ✓ |
| context window | context window / 上下文窗口 | ✓ |
| embedding | embedding | ✓ |
| MoE | MoE / 混合专家 | ✓ |
| LoRA / QLoRA | 同左 | ✓ |
| pretraining | 预训练 | |
| fine-tune / SFT / RLHF / DPO / PPO | 同左 | ✓ |
| inference | 推理 | |
| beam search / top-k / top-p / temperature | 同左 | ✓ |
| hallucination | hallucination / 幻觉 | ✓ |

## Agent / 工程

| English | 中文 | 保留英文 |
|---|---|:---:|
| agent | agent | ✓ |
| agent loop | agent loop | ✓ |
| prompt / system prompt | 同左 | ✓ |
| tool use / function call | 同左 | ✓ |
| MCP | MCP | ✓ |
| ReAct | ReAct | ✓ |
| ReWOO | ReWOO | ✓ |
| CoT / ToT | 同左 | ✓ |
| RAG | RAG | ✓ |
| vector database | 向量数据库 | |
| embedding model | embedding 模型 | ✓（embedding） |
| chunking | chunking / 切片 | ✓ |
| retrieval | 检索 | |
| reranker | reranker | ✓ |
| evaluation | 评估 | |
| benchmark | 基准（测试） | |
| latency / throughput | 延迟 / 吞吐 | |
| observability | 可观测性 | |
| guardrail / output guardrail | guardrail / 护栏（首次括注） | ✓ |
| handoff / handoff packet | handoff / 交接包（首次括注） | ✓ |
| compaction | compaction / 压缩（首次括注） | ✓ |
| workbench | workbench / 工作台（首次括注） | ✓ |
| reviewer / validator | reviewer / 验证器（首次括注） | ✓ |
| verdict | verdict / 裁决（首次括注） | ✓ |
| trajectory | 轨迹 | |
| long-horizon | 长链路 | |
| computer-use / computer use | computer-use | ✓ |
| human-in-the-loop | human-in-the-loop（首次括注 人工确认） | ✓ |
| supervisor-worker / swarm / hierarchical / debate | 同左（多 agent 范式） | ✓ |
| router / topology / subgraph | 路由器 / 拓扑 / 子图 | |
| hop / hop counter | hop / hop 计数器 | ✓ |
| trace / span | trace / span | ✓ |
| schema / payload | schema / payload | ✓ |
| allowlist / blocklist | allowlist / blocklist（首次括注 白/黑名单） | ✓ |
| accessibility API | accessibility API | ✓ |
| virtual display / Xvfb | 虚拟显示 / Xvfb | |
| CAPTCHA | CAPTCHA | ✓ |
| ablation | 消融实验（首次括注） | |
| idempotent | 幂等 | |
| DAG | DAG（首次括注 有向无环图） | ✓ |
| replanner | replanner | ✓ |
| recipe | recipe / 配方（首次括注） | ✓ |
| evaluator-optimizer | evaluator-optimizer | ✓ |
| tripwire | 在代码标识符中保留英文，正文译为「触发」 | |

## 数据 / 工程通用

| English | 中文 | 保留英文 |
|---|---|:---:|
| dataset | 数据集 | |
| label | 标签 | |
| feature | 特征 | |
| pipeline | 流水线（也可保留 pipeline） | |
| GPU / CPU / TPU | 同左 | ✓ |
| FLOPs | FLOPs | ✓ |
| quantization | 量化 | |
| distillation | 蒸馏 | |
| pruning | 剪枝 | |
