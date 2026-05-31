# 翻译指南（Translation Guide）

本仓的中文翻译产物（`zh.md`）必须遵循以下规范。所有翻译 subagent 在动笔前必须完整加载本文件。

## 1. 范围

- **翻译**：`phases/<phase>/<lesson>/docs/en.md` → 同目录新增 `zh.md`
- **不翻译**：代码块、命令、变量名、文件名、配置；仓根英文元文件（README、AGENTS、CHANGELOG、FORKING、CONTRIBUTING、LICENSE 等）

## 2. 保留英文的术语（首次出现给括注中文，之后直接用英文）

学术 / 工程共识词，保留英文更准确：

```
token, attention, embedding, transformer, softmax, backprop, gradient,
loss, logits, MLP, RNN, CNN, GAN, VAE, RAG, MoE, LoRA, KV cache, RLHF,
DPO, PPO, prompt, agent, MCP, ReAct, CoT, ToT, function call, tool use,
fine-tune, pretraining, inference, dataset, batch, epoch, learning rate,
optimizer, SGD, Adam, AdamW, dropout, batch norm, layer norm,
attention head, multi-head attention, context window, hallucination,
tokenizer, BPE, sentencepiece, beam search, top-k, top-p, temperature,
checkpoint, baseline, ablation, zero-shot, few-shot, in-context learning,
self-attention, cross-attention, encoder, decoder, autoregressive,
diffusion, latent, manifold, gradient descent, momentum, weight decay
```

**首次出现示例**：

> attention（注意力）机制是 transformer 的核心。
> 之后再次出现直接用 `attention`。

## 3. 必译术语（中文表达更自然）

| English | 中文 |
|---|---|
| pretraining | 预训练 |
| fine-tune / fine-tuning | 微调 |
| weight | 权重 |
| bias | 偏置 |
| overfitting | 过拟合 |
| underfitting | 欠拟合 |
| regularization | 正则化 |
| inference | 推理 |
| training | 训练 |
| evaluation | 评估 |
| benchmark | 基准 / 基准测试 |
| dataset | 数据集 |
| label | 标签 |
| feature | 特征 |
| model | 模型 |
| layer | 层 |
| neuron | 神经元 |
| activation | 激活（函数） |
| backpropagation | 反向传播 |
| forward pass | 前向传播 |
| convergence | 收敛 |
| latency | 延迟 |
| throughput | 吞吐 |
| pipeline | 流水线 / 管道 |

完整对照见 [`GLOSSARY.md`](./GLOSSARY.md)。

## 4. 节奏标题（每节 6 拍）

**所有 H2 / H3 章节标题，统一中译并括注英文**（包括 Learning Objectives / Exercises 这类）：

| 英文标题 | 译为 |
|---|---|
| ## Motto | ## 座右铭（Motto） |
| ## The Problem | ## 问题（Problem） |
| ## The Concept | ## 概念（Concept） |
| ## Build It | ## 动手实现（Build It） |
| ## Use It | ## 用起来（Use It） |
| ## Ship It | ## 上线部署（Ship It） |
| ## Learning Objectives | ## 学习目标（Learning Objectives） |
| ## Prerequisites | ## 前置（Prerequisites） |
| ## Summary | ## 小结（Summary） |
| ## References | ## 参考资料（References） |
| ## Further Reading | ## 延伸阅读（Further Reading） |
| ## Exercises | ## 练习（Exercises） |
| ## Key Terms | ## 关键术语（Key Terms） |
| ## Glossary | ## 术语表（Glossary） |
| ## FAQ | ## 常见问题（FAQ） |

> 风格统一规则：英文版里出现的所有 H2 / H3 标题，中译后**都括注英文**，确保读者可以通过英文标题在原文 / 论文 / 仓库里精确搜索。

## 5. 风格

- 第二人称、口语化、保留作者风趣表达
- 不逐词直译；中文母语流畅优先
- 数学公式、`$...$`、`\[...\]`、代码块原样保留
- 公式上下文的自然语言推导要译
- Markdown 链接、图片路径不动
- 列表 / 表格结构对齐英文版（不增删条目）
- 引用块（`>`）保留并翻译内容

## 6. 文件头模板

每个 `zh.md` 在 H1 之后第一段插入译注：

```markdown
# <对应英文标题的中译>

> 译注：本文译自同目录 [`en.md`](./en.md)。术语遵循仓根 [TRANSLATION_GUIDE.md](../../../../TRANSLATION_GUIDE.md)。
```

## 7. 不要做的事

- 不要省略段落
- 不要把代码注释翻译（保持英文，便于跨语言搜索）
- 不要改 frontmatter / YAML 元数据
- 不要把 `Type:` `Languages:` `Prerequisites:` `Time:` 这些元字段值改写——只翻译键名（必要时括注）
