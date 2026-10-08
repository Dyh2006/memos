import { create } from "@bufbuild/protobuf";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useCreateMemo, useInfiniteMemos, useUpdateMemo } from "@/hooks/useMemoQueries";
import { CAMPUS_CATEGORIES, CAMPUS_STATUSES, CAMPUS_TAG, type CampusRecord, campusCsv, parseCampus, serializeCampus } from "@/lib/campus";
import { MemoSchema, Visibility } from "@/types/proto/api/v1/memo_service_pb";

const initialRecord: CampusRecord = {
  version: 1,
  kind: "寻找失物",
  title: "",
  location: "",
  date: "",
  category: "其他",
  description: "",
  status: "待认领",
};
const selectStyle = "h-9 rounded-md border border-border bg-background px-2 text-sm";

export default function Campus() {
  const user = useCurrentUser();
  const list = useInfiniteMemos({ filter: `"${CAMPUS_TAG}" in tags`, pageSize: 100 }, { enabled: Boolean(user) });
  const createMemo = useCreateMemo();
  const updateMemo = useUpdateMemo();
  const [draft, setDraft] = useState<CampusRecord>(initialRecord);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [message, setMessage] = useState("");
  const entries = (list.data?.pages.flatMap((p) => p.memos) ?? []).flatMap((memo) => {
    const record = parseCampus(memo.content);
    return record ? [{ memo, record }] : [];
  });
  const filtered = entries.filter(
    ({ record: r }) =>
      (!status || r.status === status) &&
      (!kind || r.kind === kind) &&
      (!category || r.category === category) &&
      (!after || r.date >= after) &&
      (!before || r.date <= before) &&
      `${r.title} ${r.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const download = () => {
    const url = URL.createObjectURL(new Blob([campusCsv(filtered.map((e) => e.record))], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "拾光校园_筛选记录.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const patch = (key: keyof CampusRecord, value: string) => setDraft((r) => ({ ...r, [key]: value }));
  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="space-y-3 border-b pb-6">
        <p className="text-sm text-muted-foreground">校园失物招领</p>
        <h1 className="text-3xl font-semibold">拾光校园</h1>
        <p className="text-muted-foreground">按地点找物品，让每次归还都有记录。</p>
        <p className="text-sm text-muted-foreground">
          仅本站登录用户可见。请勿填写手机号、学号或证件号码，认领时通过详情页留言约定校内服务点核验。
        </p>
      </header>
      {!user ? (
        <Link className="underline" to="/auth">
          登录后查看与发布
        </Link>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowForm(!showForm)}>{showForm ? "收起表单" : "发布失物信息"}</Button>
            <Button variant="outline" onClick={() => list.refetch()} disabled={list.isFetching}>
              刷新
            </Button>
            <Button
              variant="outline"
              onClick={download}
              disabled={Boolean(list.hasNextPage) || list.isFetching || list.isError || !filtered.length}
            >
              导出筛选结果
            </Button>
          </div>
          <p role="status" className="text-sm">
            {message}
          </p>
          {showForm && (
            <form
              className="space-y-4 rounded-lg border p-5"
              onSubmit={async (event) => {
                event.preventDefault();
                setMessage("");
                if (!draft.title.trim() || !draft.location.trim() || !draft.date) {
                  setMessage("请填写物品、地点和日期。");
                  return;
                }
                try {
                  await createMemo.mutateAsync(
                    create(MemoSchema, {
                      content: serializeCampus({ ...draft, title: draft.title.trim(), location: draft.location.trim() }),
                      visibility: Visibility.PROTECTED,
                    }),
                  );
                  setDraft(initialRecord);
                  setShowForm(false);
                  setMessage("发布成功，本站登录用户可查看。");
                } catch {
                  setMessage("发布失败，请检查登录状态或稍后重试，填写内容已保留。");
                }
              }}
            >
              <h2 className="font-semibold">发布信息</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  信息类型
                  <select className={selectStyle} value={draft.kind} onChange={(e) => patch("kind", e.target.value)}>
                    <option>寻找失物</option>
                    <option>拾到物品</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  物品类别
                  <select className={selectStyle} value={draft.category} onChange={(e) => patch("category", e.target.value)}>
                    {CAMPUS_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  物品名称
                  <Input
                    required
                    maxLength={80}
                    value={draft.title}
                    onChange={(e) => patch("title", e.target.value)}
                    placeholder="例如：黑色折叠伞"
                  />
                </label>
                <label className="grid gap-1">
                  校区与具体地点
                  <Input
                    required
                    maxLength={100}
                    value={draft.location}
                    onChange={(e) => patch("location", e.target.value)}
                    placeholder="例如：主校区 图书馆二楼"
                  />
                </label>
                <label className="grid gap-1">
                  丢失或拾到日期
                  <Input required type="date" value={draft.date} onChange={(e) => patch("date", e.target.value)} />
                </label>
              </div>
              <label className="grid gap-1">
                补充说明
                <textarea
                  className="min-h-24 rounded-md border p-3"
                  maxLength={1000}
                  value={draft.description}
                  onChange={(e) => patch("description", e.target.value)}
                  placeholder="描述物品外观和保管地点，保留部分特征用于核验。"
                />
              </label>
              <Button type="submit" disabled={createMemo.isPending}>
                {createMemo.isPending ? "发布中…" : "确认发布"}
              </Button>
            </form>
          )}
          <section aria-label="筛选条件" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm">
              物品或地点
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="输入关键词" />
            </label>
            <label className="grid gap-1 text-sm">
              状态
              <select className={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">全部状态</option>
                {CAMPUS_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              类型
              <select className={selectStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">全部类型</option>
                <option>寻找失物</option>
                <option>拾到物品</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              类别
              <select className={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">全部类别</option>
                {CAMPUS_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              开始日期
              <Input type="date" value={after} onChange={(e) => setAfter(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              结束日期
              <Input type="date" value={before} onChange={(e) => setBefore(e.target.value)} />
            </label>
          </section>
          <p className="text-sm text-muted-foreground">
            已加载 {entries.length} 条，筛选匹配 {filtered.length} 条，其中已归还{" "}
            {filtered.filter((e) => e.record.status === "已归还").length} 条。{list.hasNextPage && "仍有记录未加载，请加载全部后导出。"}
          </p>
          {list.isPending && <p>正在读取记录…</p>}
          {list.isError && <p role="alert">读取失败，请点击刷新重试。</p>}
          {!list.isPending && !list.isError && !filtered.length && <p>暂无匹配记录，可以调整筛选条件或发布新信息。</p>}
          <div className="space-y-4">
            {filtered.map(({ memo, record: r }) => (
              <article key={memo.name} className="space-y-3 rounded-lg border p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="text-lg font-semibold">{r.title}</h2>
                  <span className="text-sm text-muted-foreground">
                    {r.kind} · {r.status}
                  </span>
                </div>
                <p className="text-sm">
                  {r.location}　{r.date}　{r.category}
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link className="text-sm underline" to={`/${memo.name}`}>
                    查看详情与留言
                  </Link>
                  {memo.creator === user.name && (
                    <label className="flex items-center gap-2 text-sm">
                      更新状态
                      <select
                        aria-label={`${r.title}的状态`}
                        className={selectStyle}
                        value={r.status}
                        disabled={updateMemo.isPending}
                        onChange={async (e) => {
                          try {
                            await updateMemo.mutateAsync({
                              update: {
                                name: memo.name,
                                content: serializeCampus({ ...r, status: e.target.value as CampusRecord["status"] }),
                              },
                              updateMask: ["content"],
                            });
                            setMessage("状态已更新。");
                          } catch {
                            setMessage("状态更新失败，请刷新后重试。");
                          }
                        }}
                      >
                        {CAMPUS_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </article>
            ))}
          </div>
          {list.hasNextPage && (
            <Button variant="outline" onClick={() => list.fetchNextPage()} disabled={list.isFetching}>
              加载更多记录
            </Button>
          )}
        </>
      )}
      <footer className="border-t pt-4 text-xs text-muted-foreground">
        基于 Memos 开源项目改造。校园字段、筛选、状态管理与 CSV 导出为本项目新增。
      </footer>
    </main>
  );
}
