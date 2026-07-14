import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import axios from "axios";
import { useAppStore } from "../store/useAppStore";
import { useUploadQueue } from "../hooks/useUploadQueue";
import { scanDroppedItems } from "../utils/fileScanner";
import { formatBytes } from "../utils/format";
import { StatsCard } from "../components/StatsCard";
import { UploadFile } from "../types";
import { gitService } from "../api/gitService";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  IconButton,
  LinearProgress,
  Chip,
  FormControlLabel,
  RadioGroup,
  Radio,
  Tabs,
  Tab,
  Alert,
  Tooltip,
  CircularProgress,
  useTheme,
  Stack,
  InputAdornment,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  CloudUpload as CloudUploadIcon,
  DeleteOutlined as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  CancelOutlined as CancelIcon,
  Refresh as RefreshIcon,
  InsertDriveFile as FileIcon,
  FolderOpen as FolderIcon,
  ErrorOutlined as ErrorIcon,
  CheckCircleOutlined as SuccessIcon,
  Sync as SyncIcon,
  ArrowForward as ArrowForwardIcon,
  HourglassEmpty as QueuedIcon,
  Search as SearchIcon,
  CallSplit as BranchIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  Folder as FolderFilledIcon,
  ChevronRight as ChevronRightIcon,
  AccountTree as RepoTreeIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as MarkdownIcon,
  Code as CodeIcon,
  TextSnippet as TextIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as SlideshowIcon,
  Archive as ArchiveIcon,
  MusicNote as AudioIcon,
  Movie as VideoIcon,
  DataObject as JsonIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Dns as DnsIcon,
  History as HistoryIcon,
  Bolt as BoltIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { GitConfig, UploadHistoryEntry } from "../types";

// Config Card Component moved outside to ensure stable reference and proper updates
const ConfigCard = ({
  conf,
  onClick,
  onToggleFavorite,
  history
}: {
  conf: GitConfig;
  onClick: () => void;
  onToggleFavorite: () => void;
  history: UploadHistoryEntry[];
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isGitlab = conf.provider === "gitlab";
  const accent = isGitlab ? "#fc6d26" : theme.palette.primary.main;

  const lastSync = history.find(h =>
    h.owner === conf.owner &&
    h.repo === conf.repo &&
    (h.provider || 'github') === conf.provider
  );

  const usage = history.filter(h =>
    h.owner === conf.owner &&
    h.repo === conf.repo &&
    (h.provider || 'github') === conf.provider
  ).reduce((acc, h) => acc + (h.successCount || 0) + (h.failedCount || 0), 0);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  const repoLabel = conf.provider === 'gitlab'
    ? (conf.owner ? `${conf.owner}/${conf.repo}` : conf.repo)
    : `${conf.owner}/${conf.repo}`;

  const initials = (conf.repo || conf.name || "?")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <Card
      component={motion.div}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderRadius: 3,
        position: 'relative',
        overflow: 'visible',
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage: isDark
          ? `linear-gradient(160deg, ${alpha(accent, 0.07)} 0%, ${theme.palette.background.paper} 45%)`
          : `linear-gradient(160deg, ${alpha(accent, 0.05)} 0%, ${theme.palette.background.paper} 45%)`,
        boxShadow: isDark
          ? "0 1px 3px rgba(0,0,0,0.5)"
          : "0 1px 3px rgba(15,23,42,0.06)",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease, transform 0.25s ease",
        "&:hover": {
          borderColor: alpha(accent, 0.5),
          boxShadow: `0 16px 32px -12px ${alpha(accent, 0.35)}`,
        },
      }}
    >
      {/* Accent top edge */}
      <Box
        sx={{
          position: "absolute",
          top: -1,
          left: 12,
          right: 12,
          height: 3,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0)})`,
        }}
      />

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        sx={{
          position: 'absolute',
          top: -12,
          right: -12,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[3],
          transition: "transform 0.15s ease, color 0.15s ease",
          '&:hover': { bgcolor: 'background.paper', transform: 'scale(1.15)' }
        }}
        color={conf.isFavorite ? "warning" : "default"}
      >
        {conf.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>

      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          {/* Header: avatar + name/repo */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.85rem",
                letterSpacing: "0.02em",
                color: accent,
                bgcolor: alpha(accent, isDark ? 0.16 : 0.1),
                border: `1px solid ${alpha(accent, 0.25)}`,
              }}
            >
              {initials}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conf.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <RepoTreeIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                {repoLabel}
              </Typography>
            </Box>
          </Stack>

          {/* Provider + branch pills */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={(conf.provider || 'github').toUpperCase()}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.6rem',
                height: 20,
                borderRadius: 1,
                color: accent,
                bgcolor: alpha(accent, isDark ? 0.15 : 0.08),
                border: `1px solid ${alpha(accent, 0.25)}`,
              }}
            />
            <Chip
              icon={<BranchIcon sx={{ fontSize: '12px !important' }} />}
              label={conf.branch}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 700,
                fontSize: '0.65rem',
                height: 20,
                borderRadius: 1,
                fontFamily: 'monospace',
                color: 'text.secondary',
                borderColor: theme.palette.divider,
              }}
            />
          </Stack>

          <Divider sx={{ borderStyle: "dashed" }} />

          {/* Stats */}
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 6 }}>
              <Stack
                spacing={0.25}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                }}
              >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <HistoryIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                    LAST SYNC
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: lastSync ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {lastSync ? formatDate(lastSync.timestamp) : 'Never'}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Stack
                spacing={0.25}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                }}
              >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <BoltIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                    REQUESTS
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.primary' }}>
                  {usage} total
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          {/* Base URL footer */}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <DnsIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {conf.baseUrl}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const {
    config,
    filesQueue,
    setFilesQueue,
    updateFileStatus,
    removeFileFromQueue,
    clearQueue,
    isUploading,
    commitMode,
    setCommitMode,
    customCommitMessage,
    setCustomCommitMessage,
    configs,
    setConfig,
    toggleFavorite,
    history,
    fetchHistory,
  } = useAppStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBackToDashboard = () => {
    if (isUploading) {
      if (!window.confirm("A synchronization is currently in progress. Going back will not stop it, but you'll lose sight of individual file progress. Continue?")) {
        return;
      }
    }
    setConfig(null);
  };

  const { startSync, cancelSync, retryFile, stats } = useUploadQueue({
    onSyncComplete: () => {
      fetchRepoTree(true);
    }
  });
  const [filterTab, setFilterTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  // Repository Explorer State
  const [repoTree, setRepoTree] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState<boolean>(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");

  // Files Sync Queue Explorer State
  const [queueCurrentPath, setQueueCurrentPath] = useState<string>("");

  // NOTE: `forceRefresh` param is forwarded straight into
  // githubService.getFullRepositoryTree, which appends a cache-busting
  // query param + no-cache headers on the actual network request when
  // forceRefresh = true. This guarantees the "Refresh" button always
  // fetches fresh data from GitHub instead of getting a stale cached
  // response for the same request URL.
  const fetchRepoTree = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!config) {
        setRepoTree([]);
        setTreeError(null);
        return;
      }
      setTreeLoading(true);
      setTreeError(null);
      try {
        const tree = await gitService.getFullRepositoryTree(config, forceRefresh);
        setRepoTree(tree);
      } catch (err: any) {
        setTreeError(err.message || "Failed to load repository tree.");
      } finally {
        setTreeLoading(false);
      }
    },
    [config],
  );

  // Fetch on mount or config change
  useEffect(() => {
    fetchRepoTree();
  }, [fetchRepoTree]);

  // Helper to extract item name from full path
  const getItemName = (path: string) => {
    const lastIndex = path.lastIndexOf("/");
    return lastIndex === -1 ? path : path.substring(lastIndex + 1);
  };

  // Helper to return a file-type-specific icon + color based on extension / name
  const getFileTypeIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const lowerName = fileName.toLowerCase();

    // README files (with or without extension)
    if (lowerName.startsWith("readme")) {
      return <MarkdownIcon sx={{ color: "#0ea5e9" }} fontSize="small" />;
    }

    switch (ext) {
      // Images
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "webp":
      case "bmp":
      case "ico":
        return <ImageIcon sx={{ color: "#a855f7" }} fontSize="small" />;

      // PDF
      case "pdf":
        return <PdfIcon sx={{ color: "#ef4444" }} fontSize="small" />;

      // Markdown / docs
      case "md":
      case "mdx":
        return <MarkdownIcon sx={{ color: "#0ea5e9" }} fontSize="small" />;

      // Plain text / logs
      case "txt":
      case "log":
        return <TextIcon sx={{ color: "text.secondary" }} fontSize="small" />;

      // JSON / config files
      case "json":
      case "yml":
      case "yaml":
      case "toml":
        return <JsonIcon sx={{ color: "#f59e0b" }} fontSize="small" />;

      // Spreadsheets
      case "xls":
      case "xlsx":
      case "csv":
        return <SpreadsheetIcon sx={{ color: "#10b981" }} fontSize="small" />;

      // Presentations
      case "ppt":
      case "pptx":
        return <SlideshowIcon sx={{ color: "#f97316" }} fontSize="small" />;

      // Archives
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return <ArchiveIcon sx={{ color: "#78716c" }} fontSize="small" />;

      // Audio
      case "mp3":
      case "wav":
      case "ogg":
        return <AudioIcon sx={{ color: "#ec4899" }} fontSize="small" />;

      // Video
      case "mp4":
      case "mov":
      case "avi":
      case "mkv":
        return <VideoIcon sx={{ color: "#8b5cf6" }} fontSize="small" />;

      // Code files
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "py":
      case "java":
      case "cpp":
      case "c":
      case "html":
      case "css":
      case "php":
      case "go":
      case "rs":
        return <CodeIcon sx={{ color: "#3b82f6" }} fontSize="small" />;

      default:
        return <FileIcon sx={{ color: "text.secondary" }} fontSize="small" />;
    }
  };

  // Filter immediate children of currentPath
  const currentChildren = repoTree.filter((item) => {
    if (currentPath === "") {
      return !item.path.includes("/");
    } else {
      const prefix = `${currentPath}/`;
      if (item.path.startsWith(prefix)) {
        const suffix = item.path.substring(prefix.length);
        return !suffix.includes("/");
      }
      return false;
    }
  });

  // Sort: folders first, then files, both alphabetically
  const sortedChildren = [...currentChildren].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "tree" ? -1 : 1;
    }
    const nameA = getItemName(a.path).toLowerCase();
    const nameB = getItemName(b.path).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Total file count (folders excluded) & total size across the entire repo tree
  const totalFileCount = repoTree.filter((item) => item.type !== "tree").length;
  const totalRepoSize = repoTree
    .filter((item) => item.type !== "tree")
    .reduce((acc, item) => acc + (item.size || 0), 0);

  const breadcrumbSegments = currentPath ? currentPath.split("/") : [];

  const handleBreadcrumbClick = (index: number) => {
    const newPath = breadcrumbSegments.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const handleBackClick = () => {
    if (currentPath === "") return;
    const lastSlash = currentPath.lastIndexOf("/");
    if (lastSlash === -1) {
      setCurrentPath("");
    } else {
      setCurrentPath(currentPath.substring(0, lastSlash));
    }
  };

  const handleBackup = async () => {
    if (!config) {
      toast.error("Configure credentials first.");
      return;
    }

    setIsBackingUp(true);
    toast.loading(`Downloading branch backup from ${config.provider || 'Git Provider'}...`, { id: "backup-toast" });

    // Direct download
    if (config.provider === 'gitlab') {
        const projectId = encodeURIComponent(config.owner ? `${config.owner}/${config.repo}` : config.repo);
        window.open(`${config.baseUrl}/projects/${projectId}/repository/archive.zip?sha=${config.branch}`, "_blank");
    } else {
        window.open(`https://github.com/${config.owner}/${config.repo}/archive/refs/heads/${config.branch}.zip`, "_blank");
    }
    toast.success("Backup download started!", { id: "backup-toast" });
    setIsBackingUp(false);

    // Start sync process
    startSync();
  };

  // Download the current branch as a zip from the Repository Explorer
  const handleDownloadRepoZip = () => {
    if (!config) {
      toast.error("Configure credentials first.");
      return;
    }
    toast.success("Repository download started!");
    if (config.provider === 'gitlab') {
        const projectId = encodeURIComponent(config.owner ? `${config.owner}/${config.repo}` : config.repo);
        window.open(`${config.baseUrl}/projects/${projectId}/repository/archive.zip?sha=${config.branch}`, "_blank");
    } else {
        window.open(`https://github.com/${config.owner}/${config.repo}/archive/refs/heads/${config.branch}.zip`, "_blank");
    }
  };

  // Helper to add scanned files to the queue without duplicates
  const addScannedFiles = useCallback(
    (scanned: { file: File; path: string }[]) => {
      setFilesQueue((prev) => {
        const isQueueCompleted = prev.length > 0 && prev.every(
          (f) => f.status === "success" || f.status === "failed" || f.status === "cancelled"
        );

        const baseQueue = isQueueCompleted ? [] : prev;
        const existingPaths = new Set(baseQueue.map((f) => f.path));
        const newFilesToAdd: UploadFile[] = [];

        for (const item of scanned) {
          if (!existingPaths.has(item.path)) {
            newFilesToAdd.push({
              id: Math.random().toString(36).substring(2, 9),
              file: item.file,
              path: item.path,
              name: item.file.name,
              size: item.file.size,
              status: "idle",
              progress: 0,
              sha: null,
              action: null,
              error: null,
            });
          }
        }

        if (newFilesToAdd.length === 0 && !isQueueCompleted) {
          setTimeout(() => toast.success("Files are already in the queue.", { id: "drop-toast" }), 0);
          return prev;
        }

        setTimeout(() => toast.success(`Added ${newFilesToAdd.length} files to queue.`, { id: "drop-toast" }), 0);
        return [...baseQueue, ...newFilesToAdd];
      });
    },
    [setFilesQueue],
  );

  // Dropzone setup
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!config) {
        toast.error("Configure credentials before adding files.");
        navigate("/config");
        return;
      }

      // map files using the custom relativePath property set during extraction
      const scanned = acceptedFiles.map((file) => ({
        file,
        path: (file as any).relativePath || file.name,
      }));

      addScannedFiles(scanned);
    },
    [config, addScannedFiles, navigate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: isUploading,
    noKeyboard: isUploading,
    getFilesFromEvent: async (event) => {
      const dataTransfer = (event as any).dataTransfer;
      // Handle drag-and-drop
      if (dataTransfer && dataTransfer.items) {
        toast.loading("Processing dropped items...", { id: "drop-toast" });
        const scanned = await scanDroppedItems(dataTransfer.items);
        return scanned.map((item) => {
          Object.defineProperty(item.file, "relativePath", {
            value: item.path,
            writable: true,
            enumerable: true,
            configurable: true,
          });
          return item.file;
        });
      }

      // Handle standard file selection
      const target = (event as any).target;
      if (target && target.files) {
        const files = Array.from(target.files) as File[];
        return files.map((file) => {
          Object.defineProperty(file, "relativePath", {
            value: (file as any).webkitRelativePath || file.name,
            writable: true,
            enumerable: true,
            configurable: true,
          });
          return file;
        });
      }

      return [];
    },
  });

  // Filter and search queue
  const filteredQueue = filesQueue.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.path.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filterTab) {
      case "queued":
        return (
          file.status === "queued" ||
          file.status === "uploading" ||
          file.status === "scanning"
        );
      case "success":
        return file.status === "success";
      case "failed":
        return file.status === "failed";
      case "idle":
        return file.status === "idle" || file.status === "cancelled";
      default:
        return true;
    }
  });

  // Transform filteredQueue into a tree structure for the current path
  const queueBreadcrumbSegments = queueCurrentPath ? queueCurrentPath.split("/") : [];

  const handleQueueBreadcrumbClick = (index: number) => {
    const newPath = queueBreadcrumbSegments.slice(0, index + 1).join("/");
    setQueueCurrentPath(newPath);
  };

  const handleQueueBackClick = () => {
    if (queueCurrentPath === "") return;
    const lastSlash = queueCurrentPath.lastIndexOf("/");
    if (lastSlash === -1) {
      setQueueCurrentPath("");
    } else {
      setQueueCurrentPath(queueCurrentPath.substring(0, lastSlash));
    }
  };

  const queueItems: any[] = [];
  const folderSizes: Record<string, number> = {};
  const folderNames: Set<string> = new Set();
  const directFiles: UploadFile[] = [];
  const failedFolders = new Set<string>();

  for (const file of filteredQueue) {
    if (file.status === "failed") {
      const parts = file.path.split("/");
      let currentFolder = "";
      for (let i = 0; i < parts.length - 1; i++) {
        currentFolder = currentFolder ? `${currentFolder}/${parts[i]}` : parts[i];
        failedFolders.add(currentFolder);
      }
    }

    if (queueCurrentPath === "") {
      if (!file.path.includes("/")) {
        directFiles.push(file);
      } else {
        const folderName = file.path.split("/")[0];
        folderNames.add(folderName);
        folderSizes[folderName] = (folderSizes[folderName] || 0) + file.size;
      }
    } else {
      const prefix = `${queueCurrentPath}/`;
      if (file.path.startsWith(prefix)) {
        const suffix = file.path.substring(prefix.length);
        if (!suffix.includes("/")) {
          directFiles.push(file);
        } else {
          const folderName = suffix.split("/")[0];
          folderNames.add(folderName);
          folderSizes[folderName] = (folderSizes[folderName] || 0) + file.size;
        }
      }
    }
  }

  folderNames.forEach((folderName) => {
    queueItems.push({
      type: "tree",
      name: folderName,
      path: queueCurrentPath ? `${queueCurrentPath}/${folderName}` : folderName,
      size: folderSizes[folderName],
    });
  });

  directFiles.forEach((file) => {
    queueItems.push({
      type: "blob",
      name: file.name,
      path: file.path,
      size: file.size,
      fileRef: file,
    });
  });

  queueItems.sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Helper to format status tag color (Raycast/Linear rounded pills)
  const getStatusChip = (file: UploadFile) => {
    const baseStyle = {
      fontWeight: 600,
      fontSize: "0.75rem",
      height: 22,
      borderRadius: 1.5,
      border: "1px solid",
    };

    switch (file.status) {
      case "scanning":
        return (
          <Chip
            label="Scanning"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(56, 189, 248, 0.1)"
                  : "rgba(14, 165, 233, 0.05)",
              color: "info.main",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(56, 189, 248, 0.2)"
                  : "rgba(14, 165, 233, 0.1)",
            }}
            icon={<CircularProgress size={10} color="inherit" />}
          />
        );
      case "queued":
        return (
          <Chip
            label="Queued"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(245, 158, 11, 0.1)"
                  : "rgba(245, 158, 11, 0.05)",
              color: "warning.main",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(245, 158, 11, 0.1)",
            }}
            icon={<QueuedIcon sx={{ fontSize: "10px !important" }} />}
          />
        );
      case "uploading":
        return (
          <Chip
            label="Syncing"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(37, 99, 235, 0.05)",
              color: "primary.main",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(37, 99, 235, 0.1)",
            }}
            icon={<CircularProgress size={10} color="inherit" />}
          />
        );
      case "success":
        return (
          <Chip
            label="Completed"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(16, 185, 129, 0.05)",
              color: "success.main",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(16, 185, 129, 0.2)"
                  : "rgba(16, 185, 129, 0.1)",
            }}
            icon={<SuccessIcon sx={{ fontSize: "12px !important" }} />}
          />
        );
      case "failed":
        return (
          <Tooltip title={file.error || "Upload failed"}>
            <Chip
              label="Failed"
              size="small"
              sx={{
                ...baseStyle,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(239, 68, 68, 0.05)",
                color: "error.main",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(239, 68, 68, 0.1)",
              }}
              icon={<ErrorIcon sx={{ fontSize: "12px !important" }} />}
            />
          </Tooltip>
        );
      case "cancelled":
        return (
          <Chip
            label="Cancelled"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(0, 0, 0, 0.02)",
              color: "text.secondary",
              borderColor: theme.palette.divider,
            }}
          />
        );
      default:
        return (
          <Chip
            label="Idle"
            size="small"
            sx={{
              ...baseStyle,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(0, 0, 0, 0.02)",
              color: "text.secondary",
              borderColor: theme.palette.divider,
            }}
          />
        );
    }
  };

  // Helper to display file Action
  const getActionChip = (action: UploadFile["action"]) => {
    if (action === "create") {
      return (
        <Chip
          label="Create"
          size="small"
          sx={{
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(16, 185, 129, 0.08)",
            color: "success.main",
            border: `1px solid ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)"}`,
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 18,
            borderRadius: 1,
          }}
        />
      );
    }
    if (action === "update") {
      return (
        <Chip
          label="Update"
          size="small"
          sx={{
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(37, 99, 235, 0.08)",
            color: "primary.main",
            border: `1px solid ${theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.1)"}`,
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 18,
            borderRadius: 1,
          }}
        />
      );
    }
    return null;
  };

  // Retry all failed uploads
  const handleRetryFailed = () => {
    const failedFiles = filesQueue.filter((f) => f.status === "failed");
    if (failedFiles.length === 0) return;

    failedFiles.forEach((f) => {
      updateFileStatus(f.id, { status: "idle", progress: 0, error: null });
    });

    startSync();
  };

  // Helper to format date
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  const favorites = configs.filter(c => c.isFavorite);
  const others = configs.filter(c => !c.isFavorite);

  if (!config) {
    return (
      <Box sx={{ py: 2 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.02em" }}>
              GitSync Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Select a repository profile to begin synchronizing your local code.
            </Typography>
          </Box>

          {configs.length === 0 && (
             <Card
             sx={{
               borderRadius: 3,
               border: `1px dashed ${theme.palette.divider}`,
               bgcolor: "transparent",
               textAlign: "center",
               py: 8,
               px: 3,
             }}
           >
             <FolderIcon fontSize="large" sx={{ opacity: 0.3, mb: 2 }} />
             <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
               No Configurations Found
             </Typography>
             <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: "auto", mb: 3 }}>
               Get started by adding your first GitHub or GitLab configuration profile.
             </Typography>
             <Button
               variant="contained"
               onClick={() => navigate("/config")}
               sx={{ borderRadius: 2, textTransform: "none" }}
             >
               Go to Settings
             </Button>
           </Card>
          )}

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
                <StarIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'text.secondary' }}>
                  Favorites ({favorites.length})
                </Typography>
              </Stack>
              <Grid container spacing={3}>
                {favorites.map(conf => (
                  <Grid key={conf.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ConfigCard
                      conf={conf}
                      onClick={() => setConfig(conf)}
                      onToggleFavorite={() => {
                        toggleFavorite(conf.id!);
                        if (conf.isFavorite) {
                          toast.success(`${conf.name} removed from Favorites successfully.`);
                        } else {
                          toast.success(`${conf.name} added to Favorites successfully.`);
                        }
                      }}
                      history={history}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Other Configurations Section */}
          {others.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
                <RepoTreeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'text.secondary' }}>
                  Other Configurations ({others.length})
                </Typography>
              </Stack>
              <Grid container spacing={3}>
                {others.map(conf => (
                  <Grid key={conf.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ConfigCard
                      conf={conf}
                      onClick={() => setConfig(conf)}
                      onToggleFavorite={() => {
                        toggleFavorite(conf.id!);
                        if (conf.isFavorite) {
                          toast.success(`${conf.name} removed from Favorites successfully.`);
                        } else {
                          toast.success(`${conf.name} added to Favorites successfully.`);
                        }
                      }}
                      history={history}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {configs.length > 0 && others.length === 0 && favorites.length === 0 && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No profiles match your view.
            </Alert>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      {/* Back Button & Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToDashboard}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: 'text.primary' }
          }}
        >
          Back to Profiles
        </Button>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              label={(config.provider || 'github').toUpperCase()}
              size="small"
              color={config.provider === 'gitlab' ? "secondary" : "primary"}
              sx={{ fontWeight: 800, height: 24, borderRadius: 1.5 }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {config.name}
            </Typography>
        </Stack>
      </Box>

      {/* Stats Cards Row */}
      {filesQueue.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Files Queue"
              value={stats.totalCount}
              icon={<FileIcon />}
              color="#3b82f6"
              subtitle={`${formatBytes(filesQueue.reduce((acc, f) => acc + f.size, 0))} total size`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Succeeded"
              value={stats.successCount}
              icon={<SuccessIcon />}
              color="#10b981"
              subtitle={
                stats.totalCount > 0
                  ? `${Math.round((stats.successCount / stats.totalCount) * 100)}% success rate`
                  : undefined
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Failed Uploads"
              value={stats.failedCount}
              icon={<ErrorIcon />}
              color="#ef4444"
              subtitle={
                stats.failedCount > 0
                  ? `${stats.failedCount} items require retry`
                  : "No errors detected"
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Synchronization"
              value={
                isUploading
                  ? `${stats.totalProgress}%`
                  : stats.queuedCount > 0
                    ? "Paused"
                    : "Synced"
              }
              icon={
                <SyncIcon className={isUploading ? "spin-animation" : ""} />
              }
              color={
                isUploading
                  ? "#a78bfa"
                  : stats.failedCount > 0
                    ? "#ef4444"
                    : "#10b981"
              }
              subtitle={
                isUploading
                  ? `${stats.remainingCount} files remaining`
                  : "Queue is idle"
              }
            />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Upload Zone & Settings */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Grid container spacing={3}>
            {/* Default Configuration Profile Card */}
            {config ? (
              <Grid size={{ xs: 12 }}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: "text.secondary",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          Target Repository Profile
                        </Typography>
                        <Chip
                          size="small"
                          label="Active"
                          color="primary"
                          variant="outlined"
                          sx={{
                            height: 16,
                            fontSize: "0.55rem",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800, color: "text.primary" }}
                        >
                          {config.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily: "monospace",
                            display: "block",
                            mt: 0.25,
                          }}
                        >
                          {config.provider === 'gitlab' ? (config.owner ? `${config.owner}/${config.repo}` : config.repo) : `${config.owner}/${config.repo}`}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ alignItems: "center", gap: 0.5 }}
                        >
                          <BranchIcon
                            sx={{ fontSize: 13, color: "primary.main" }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: "primary.main" }}
                          >
                            {config.branch}
                          </Typography>
                        </Stack>
                        <Button
                          size="small"
                          variant="text"
                          onClick={handleBackToDashboard}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            p: 0,
                          }}
                        >
                          Switch Profile
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)"}`,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(245, 158, 11, 0.04)"
                        : "rgba(245, 158, 11, 0.02)",
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: "warning.main",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          Target Repository Profile
                        </Typography>
                        <Chip
                          size="small"
                          label="Not Set"
                          color="warning"
                          variant="outlined"
                          sx={{
                            height: 16,
                            fontSize: "0.55rem",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800, color: "text.primary" }}
                        >
                          No Default Configuration Set
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          Please set a default configuration profile to start
                          pushing and syncing files.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        onClick={() => navigate("/config")}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          borderRadius: 1.5,
                          alignSelf: "flex-start",
                        }}
                      >
                        Select Default Profile
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Drag & Drop Area */}
            <Grid size={{ xs: 12 }}>
              <Card
                {...getRootProps()}
                sx={{
                  border: `2px dashed ${isDragActive ? "#2563eb" : theme.palette.divider}`,
                  bgcolor: isDragActive
                    ? theme.palette.mode === "dark"
                      ? "rgba(59, 130, 246, 0.04)"
                      : "rgba(37, 99, 235, 0.02)"
                    : "background.paper",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  borderRadius: 2,
                  textAlign: "center",
                  py: 6,
                  px: 3,
                  transition: "all 0.15s ease-in-out",
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": {
                    borderColor: isUploading
                      ? theme.palette.divider
                      : "#2563eb",
                    bgcolor: isUploading
                      ? "background.paper"
                      : theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.01)"
                        : "rgba(0, 0, 0, 0.005)",
                  },
                }}
              >
                <input {...getInputProps()} />
                <CloudUploadIcon
                  sx={{
                    fontSize: 40,
                    color: isDragActive ? "primary.main" : "text.secondary",
                    mb: 1.5,
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}
                >
                  {isDragActive
                    ? "Drop items here..."
                    : "Drag & drop files or folders"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2.5 }}
                >
                  Supports recursive subfolders traversal & multi-selections
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={isUploading}
                  sx={{ borderRadius: 1.5, px: 2, py: 0.75 }}
                >
                  Choose Local Files
                </Button>
              </Card>
            </Grid>

            {/* Commit Message Settings */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                      color: "text.primary",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Commit Configuration
                  </Typography>

                  <RadioGroup
                    value={commitMode}
                    onChange={(e) =>
                      setCommitMode(e.target.value as "auto" | "custom")
                    }
                    sx={{ mb: 2 }}
                  >
                    <FormControlLabel
                      value="auto"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            Automatic Commit Messages
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Generates context-aware titles: e.g. "Create
                            login.ts"
                          </Typography>
                        </Box>
                      }
                      sx={{ mb: 1.5, alignItems: "flex-start" }}
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            Single Custom Message
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Apply one message to the entire synchronization run
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: "flex-start" }}
                    />
                  </RadioGroup>

                  {commitMode === "custom" && (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Commit Message"
                      placeholder="e.g. Upload build configs, modernize styles"
                      value={customCommitMessage}
                      onChange={(e) => setCustomCommitMessage(e.target.value)}
                      disabled={isUploading}
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Upload Queue List */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card
            sx={{
              borderRadius: 2,
              height: "100%",
              minHeight: 400,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* ── Sync Control Panel ── */}
            {filesQueue.length > 0 && (
              <Box
                sx={{
                  p: 2.5,
                  pb: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.015)"
                      : "rgba(0, 0, 0, 0.005)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap" }}
                  >
                    {!isUploading ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={startSync}
                        disabled={stats.idleCount + stats.failedCount === 0}
                        startIcon={<PlayArrowIcon fontSize="small" />}
                        sx={{
                          py: 0.75,
                          px: 2,
                          background:
                            stats.idleCount + stats.failedCount > 0
                              ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
                              : undefined,
                          boxShadow:
                            stats.idleCount + stats.failedCount > 0
                              ? "0 4px 12px rgba(37, 99, 235, 0.2)"
                              : "none",
                        }}
                      >
                        Sync Queue ({stats.idleCount + stats.failedCount})
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={cancelSync}
                        startIcon={<CancelIcon fontSize="small" />}
                        sx={{ py: 0.75, px: 2 }}
                      >
                        Cancel Sync
                      </Button>
                    )}

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleBackup}
                      disabled={isBackingUp || isUploading}
                      startIcon={isBackingUp ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                      sx={{ py: 0.75 }}
                    >
                      {isBackingUp ? "Downloading..." : "Backup & Push"}
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleRetryFailed}
                      disabled={isUploading || stats.failedCount === 0}
                      startIcon={<RefreshIcon fontSize="small" />}
                      sx={{ py: 0.75 }}
                    >
                      Retry Failed
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={clearQueue}
                      disabled={isUploading}
                      startIcon={<DeleteIcon fontSize="small" />}
                      sx={{
                        py: 0.75,
                        borderColor: theme.palette.error.main,
                        color: theme.palette.error.main,
                        "&:hover": {
                          borderColor: theme.palette.error.dark,
                          bgcolor:
                            theme.palette.mode === "dark"
                              ? "rgba(239, 68, 68, 0.05)"
                              : "rgba(239, 68, 68, 0.02)",
                        },
                      }}
                    >
                      Clear Queue
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}

            {/* Header controls */}
            <Box
              sx={{
                p: 2.5,
                pb: 1,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, color: "text.primary" }}
              >
                Files Sync Queue ({filteredQueue.length} items)
              </Typography>

              {/* Search bar */}
              <TextField
                placeholder="Filter files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: "100%", sm: 240 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Filter Tabs */}
            <Tabs
              value={filterTab}
              onChange={(e, val) => setFilterTab(val)}
              sx={{ px: 2 }}
            >
              <Tab value="all" label="All Files" />
              <Tab value="queued" label="Syncing" />
              <Tab value="success" label="Succeeded" />
              <Tab value="failed" label="Failed" />
              <Tab value="idle" label="Idle / Cancel" />
            </Tabs>

            {/* Global sync progress bar */}
            {isUploading && (
              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  variant="determinate"
                  value={stats.totalProgress}
                  sx={{
                    height: 3,
                    borderRadius: 0,
                    "& .MuiLinearProgress-bar": {
                      background:
                        "linear-gradient(90deg, #3b82f6 0%, #a78bfa 100%)",
                    },
                  }}
                />
              </Box>
            )}

            {/* Queue List Content */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                maxHeight: 600,
                display: "flex",
                flexDirection: "column",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(0, 0, 0, 0.1)"
                    : "rgba(0, 0, 0, 0.005)",
              }}
            >
              {/* Queue Navigation Bar: Back button + Breadcrumbs */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.005)",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleQueueBackClick}
                  disabled={queueCurrentPath === ""}
                  startIcon={<ArrowBackIcon fontSize="small" />}
                  sx={{ py: 0.5, px: 1.5, borderRadius: 1.5 }}
                >
                  Back
                </Button>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setQueueCurrentPath("")}
                    sx={{
                      fontWeight: queueCurrentPath === "" ? 700 : 500,
                      color: queueCurrentPath === "" ? "text.primary" : "text.secondary",
                      minWidth: "auto",
                      px: 0.75,
                    }}
                  >
                    Home
                  </Button>

                  {queueBreadcrumbSegments.map((segment, index) => {
                    const isLast = index === queueBreadcrumbSegments.length - 1;
                    return (
                      <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Button
                          variant="text"
                          size="small"
                          disabled={isLast}
                          onClick={() => handleQueueBreadcrumbClick(index)}
                          sx={{
                            fontWeight: isLast ? 700 : 500,
                            color: isLast ? "text.primary" : "text.secondary",
                            minWidth: "auto",
                            px: 0.75,
                            "&.Mui-disabled": {
                              color: "text.primary",
                            },
                          }}
                        >
                          {segment}
                        </Button>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>

              {queueItems.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 12,
                    px: 3,
                    color: "text.secondary",
                  }}
                >
                  <FolderIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {searchQuery
                      ? "No matching queue items found."
                      : "No files in synchronization queue."}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {searchQuery
                      ? "Clear search filter to display all files"
                      : "Drop your files or nested directories onto the drag zone"}
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                  <Table size="small" aria-label="queue files explorer table">
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)" }}>
                        <TableCell sx={{ fontWeight: 700, py: 1.5, width: "40%" }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Status / Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queueItems.map((item) => {
                        const isFolder = item.type === "tree";
                        const file = isFolder ? null : item.fileRef;

                        return (
                          <TableRow
                            key={item.path}
                            hover
                            onClick={() => {
                              if (isFolder) {
                                setQueueCurrentPath(item.path);
                              }
                            }}
                            sx={{
                              cursor: isFolder ? "pointer" : "default",
                              transition: "background-color 0.15s ease",
                              "&:hover": {
                                bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: isFolder ? 600 : 400, color: isFolder ? "primary.main" : "text.primary" }}>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  {isFolder ? (
                                    <FolderFilledIcon sx={{ color: "warning.main", fontSize: 20 }} />
                                  ) : (
                                    getFileTypeIcon(item.name)
                                  )}
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography component="span" variant="body2" sx={{ fontWeight: isFolder ? 600 : 400, color: isFolder ? "primary.main" : "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {item.name}
                                    </Typography>
                                    {!isFolder && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                                        {item.path}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>

                                {/* Progress bar under file name if uploading */}
                                {!isFolder && file?.status === "uploading" && (
                                  <Box sx={{ width: "100%", mt: 0.5, pl: 3.5 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={file.progress}
                                      sx={{ height: 4, borderRadius: 2 }}
                                    />
                                  </Box>
                                )}

                                {/* Error or SHA under file name */}
                                {!isFolder && (file?.error || file?.sha) && (
                                  <Box sx={{ pl: 3.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
                                    {file.sha && (
                                      <Typography variant="caption" color="primary.main" sx={{ fontFamily: "monospace", bgcolor: theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.05)", px: 1, py: 0.2, borderRadius: 0.5, fontSize: "0.7rem" }}>
                                        SHA: {file.sha.substring(0, 7)}
                                      </Typography>
                                    )}

                                  </Box>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                              {formatBytes(item.size || 0)}
                            </TableCell>
                            <TableCell>
                              {isFolder ? (
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  <Typography variant="caption" color="text.secondary">Folder</Typography>
                                  {failedFolders.has(item.path) && (
                                    <Chip
                                      label="Failed Files"
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, px: 0.5 }}
                                    />
                                  )}
                                </Stack>
                              ) : (
                                <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flexShrink: 0 }}>
                                  {getActionChip(file?.action)}
                                  {getStatusChip(file!)}

                                  {/* Options */}
                                  <Stack direction="row" spacing={0.5}>
                                    {file?.status === "failed" && (
                                      <Tooltip title="Retry upload">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => { e.stopPropagation(); retryFile(file.id); }}
                                          disabled={isUploading}
                                        >
                                          <RefreshIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => { e.stopPropagation(); removeFileFromQueue(file!.id); }}
                                      disabled={
                                        isUploading &&
                                        (file?.status === "uploading" || file?.status === "scanning")
                                      }
                                      sx={{
                                        "&:hover": {
                                          bgcolor: theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)",
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Git Repository Explorer Section ── */}
      {config && (
        <Card sx={{ mt: 4, borderRadius: 2, display: "flex", flexDirection: "column" }}>
          {/* Card Header */}
          <Box
            sx={{
              p: 2.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <RepoTreeIcon sx={{ color: "primary.main" }} />
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                    {config.provider === 'gitlab' ? 'GitLab' : 'GitHub'} Repository Explorer
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.75, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    icon={<BranchIcon sx={{ fontSize: "12px !important" }} />}
                    label={config.branch}
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(59, 130, 246, 0.1)"
                          : "rgba(37, 99, 235, 0.06)",
                      color: "primary.main",
                      border: `1px solid ${theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.12)"}`,
                    }}
                  />
                  <Chip
                    size="small"
                    icon={<FileIcon sx={{ fontSize: "12px !important" }} />}
                    label={`${totalFileCount} ${totalFileCount === 1 ? "file" : "files"}`}
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(168, 85, 247, 0.1)"
                          : "rgba(147, 51, 234, 0.06)",
                      color: "#a855f7",
                      border: `1px solid ${theme.palette.mode === "dark" ? "rgba(168, 85, 247, 0.2)" : "rgba(147, 51, 234, 0.12)"}`,
                    }}
                  />
                  <Chip
                    size="small"
                    icon={<ArchiveIcon sx={{ fontSize: "12px !important" }} />}
                    label={formatBytes(totalRepoSize)}
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(16, 185, 129, 0.06)",
                      color: "success.main",
                      border: `1px solid ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.12)"}`,
                    }}
                  />
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleDownloadRepoZip}
                startIcon={<DownloadIcon fontSize="small" />}
                sx={{ py: 0.75 }}
              >
                Download
              </Button>

              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchRepoTree(true)}
                disabled={treeLoading}
                startIcon={treeLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                sx={{ py: 0.75 }}
              >
                Refresh
              </Button>
            </Stack>
          </Box>

          {/* Navigation Bar: Back button + Breadcrumbs */}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.005)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={handleBackClick}
              disabled={currentPath === ""}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{ py: 0.5, px: 1.5, borderRadius: 1.5 }}
            >
              Back
            </Button>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setCurrentPath("")}
                sx={{
                  fontWeight: currentPath === "" ? 700 : 500,
                  color: currentPath === "" ? "text.primary" : "text.secondary",
                  minWidth: "auto",
                  px: 0.75,
                }}
              >
                Home
              </Button>

              {breadcrumbSegments.map((segment, index) => {
                const isLast = index === breadcrumbSegments.length - 1;
                return (
                  <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Button
                      variant="text"
                      size="small"
                      disabled={isLast}
                      onClick={() => handleBreadcrumbClick(index)}
                      sx={{
                        fontWeight: isLast ? 700 : 500,
                        color: isLast ? "text.primary" : "text.secondary",
                        minWidth: "auto",
                        px: 0.75,
                        "&.Mui-disabled": {
                          color: "text.primary",
                        },
                      }}
                    >
                      {segment}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          {/* Content Area */}
          <Box sx={{ flexGrow: 1, minHeight: 250, display: "flex", flexDirection: "column" }}>
            {treeLoading ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 1.5 }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary">
                  Fetching repository tree...
                </Typography>
              </Box>
            ) : treeError ? (
              <Box sx={{ p: 3 }}>
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => fetchRepoTree(true)}>
                      Retry
                    </Button>
                  }
                  sx={{ borderRadius: 1.5 }}
                >
                  {treeError}
                </Alert>
              </Box>
            ) : sortedChildren.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, color: "text.secondary" }}>
                <FolderIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  This folder is empty.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  No files or directories found in the current path.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                <Table size="small" aria-label="repository files explorer table">
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)" }}>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Type</TableCell>
                      {config?.provider !== 'gitlab' && <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Size</TableCell>}
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Path</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedChildren.map((item) => {
                      const isFolder = item.type === "tree";
                      const name = getItemName(item.path);
                      return (
                        <TableRow
                          key={item.path}
                          hover
                          onClick={() => {
                            if (isFolder) {
                              setCurrentPath(item.path);
                            }
                          }}
                          sx={{
                            cursor: isFolder ? "pointer" : "default",
                            transition: "background-color 0.15s ease",
                            "&:hover": {
                              bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: isFolder ? 600 : 400, color: isFolder ? "primary.main" : "text.primary" }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              {isFolder ? (
                                <FolderFilledIcon sx={{ color: "warning.main", fontSize: 20 }} />
                              ) : (
                                getFileTypeIcon(name)
                              )}
                              <Typography component="span" variant="body2" sx={{ fontWeight: isFolder ? 600 : 400, color: isFolder ? "primary.main" : "text.primary" }}>
                                {name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: "text.secondary" }}>
                            {isFolder ? "Folder" : "File"}
                          </TableCell>
                          {config?.provider !== 'gitlab' && (
                            <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                              {isFolder ? "-" : formatBytes(item.size || 0)}
                            </TableCell>
                          )}
                          <TableCell sx={{ fontFamily: "monospace", color: "text.secondary", fontSize: "0.75rem" }}>
                            {item.path}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>
      )}

      {/* Styles for rotating animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </Box>
  );
};
