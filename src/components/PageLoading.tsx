type PageLoadingProps = {
  visible: boolean;
};

const PageLoading = ({ visible }: PageLoadingProps) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm font-medium text-muted-foreground">Carregando produto...</span>
      </div>
    </div>
  );
};

export default PageLoading;
