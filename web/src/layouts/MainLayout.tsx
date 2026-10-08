import { Link, Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <section className="@container flex min-h-full w-full flex-col items-center">
      <div className="mx-auto w-full px-4 pb-8 pt-3 sm:px-6 md:pt-6">
        <Link className="mb-4 inline-block text-sm font-medium underline" to="/campus">
          拾光校园 · 失物招领
        </Link>
        <Outlet />
      </div>
    </section>
  );
};

export default MainLayout;
