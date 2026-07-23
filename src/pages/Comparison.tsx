import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  ButtonGroup,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { getComparison, getSensorsList } from '@/api/comparison';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { ChartPeriod, ComparisonResponse, SensorListItem } from '@/types';

const periodOptions: { value: ChartPeriod; label: string }[] = [
  { value: '1h', label: '1ч' },
  { value: '6h', label: '6ч' },
  { value: '24h', label: '24ч' },
  { value: 'week', label: 'Нед' },
  { value: 'month', label: 'Месяц' },
];

const Comparison: FC = () => {
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const [sensors, setSensors] = useState<SensorListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [period, setPeriod] = useState<ChartPeriod>('1h');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);

  const loadSensors = useCallback(async () => {
    try {
      const data = await getSensorsList();
      setSensors(data.sensors);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  const loadComparison = useCallback(async () => {
    if (selectedIds.length < 2) {
      setComparisonData(null);
      return;
    }
    try {
      const data = await getComparison({
        device_ids: selectedIds.join(','),
        period,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setComparisonData(data);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [selectedIds, period, dateFrom, dateTo, showSnackbar]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const filteredSensors = useMemo(
    () =>
      sensors.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.type_label.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [sensors, searchTerm]
  );

  const toggleSensor = (id: number): void => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]));
  };

  const chartOption = useMemo(() => {
    if (!comparisonData) return {};
    const labels = comparisonData.devices[0]?.data.map((p) => new Date(p.time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })) ?? [];
    return {
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: comparisonData.devices.map((device, index) => {
        const sensor = sensors.find((s) => s.id === device.id);
        return {
          name: device.name,
          type: 'line',
          data: device.data.map((p) => p.value),
          smooth: true,
          itemStyle: { color: sensor?.color || `hsl(${index * 60}, 70%, 50%)` },
        };
      }),
    };
  }, [comparisonData, sensors]);

  const handleExportPng = (): void => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) {
      showSnackbar('Сначала выберите датчики для сравнения', 'warning');
      return;
    }
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = 'comparison_chart.png';
    link.href = url;
    link.click();
  };

  const handleExportPdf = async (): Promise<void> => {
    if (!chartWrapperRef.current) {
      showSnackbar('Сначала выберите датчики для сравнения', 'warning');
      return;
    }
    const canvas = await html2canvas(chartWrapperRef.current);
    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('comparison_chart.pdf');
  };

  const handleExportExcel = (): void => {
    if (!comparisonData) {
      showSnackbar('Сначала выберите датчики для сравнения', 'warning');
      return;
    }
    const rows = comparisonData.devices[0]?.data.map((_, index) => {
      const row: Record<string, string | number> = {
        Время: new Date(comparisonData.devices[0].data[index].time).toLocaleString('ru'),
      };
      comparisonData.devices.forEach((device) => {
        row[device.name] = device.data[index]?.value ?? '';
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows ?? []);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Сравнение');
    XLSX.writeFile(workbook, 'comparison.xlsx');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: 2, minWidth: 300 }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Выберите датчики (выбрано: {selectedIds.length})
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Поиск по названию или типу датчика..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 130, overflowY: 'auto' }}>
              {filteredSensors.map((sensor) => (
                <Chip
                  key={sensor.id}
                  label={`${sensor.name} (${sensor.unit})`}
                  onClick={() => toggleSensor(sensor.id)}
                  variant={selectedIds.includes(sensor.id) ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: sensor.color,
                    bgcolor: selectedIds.includes(sensor.id) ? `${sensor.color}22` : 'transparent',
                    color: selectedIds.includes(sensor.id) ? sensor.color : 'text.primary',
                  }}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Период
            </Typography>
            <ButtonGroup size="small" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={period === option.value ? 'contained' : 'outlined'}
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                type="date"
                label="с"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <TextField
                size="small"
                type="date"
                label="по"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
              <Button variant="contained" size="small" onClick={loadComparison}>
                Применить
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Сравнение показателей {comparisonData ? `(${comparisonData.devices.length} датчика)` : ''}
          </Typography>
          <Box ref={chartWrapperRef} sx={{ height: 300 }}>
            {selectedIds.length < 2 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
                Выберите минимум 2 датчика
              </Typography>
            ) : (
              <ReactECharts ref={chartRef} option={chartOption} style={{ height: '100%', width: '100%' }} notMerge />
            )}
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Card} sx={{ maxHeight: 260 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Время</TableCell>
              {comparisonData?.devices.map((device) => <TableCell key={device.id}>{device.name}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {comparisonData?.devices[0]?.data.map((point, index) => (
              <TableRow key={point.time}>
                <TableCell>{new Date(point.time).toLocaleTimeString('ru')}</TableCell>
                {comparisonData.devices.map((device) => (
                  <TableCell key={device.id}>{device.data[index]?.value ?? '—'}</TableCell>
                ))}
              </TableRow>
            ))}
            {!comparisonData && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Выберите датчики для сравнения
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="contained" color="inherit" onClick={handleExportPng}>
          Скачать PNG
        </Button>
        <Button variant="contained" color="error" onClick={handleExportPdf}>
          Скачать PDF
        </Button>
        <Button variant="contained" color="success" onClick={handleExportExcel}>
          Скачать Excel
        </Button>
      </Box>
    </Box>
  );
};

export default Comparison;
