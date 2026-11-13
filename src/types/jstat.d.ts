// Tipos mínimos de jStat (MIT): solo lo que usa la app. El paquete no trae los suyos.
declare module 'jstat' {
  interface Distribution {
    cdf(x: number, mean: number, std: number): number;
    inv(p: number, mean: number, std: number): number;
  }
  interface JStat {
    normal: Distribution;
  }
  const jStat: JStat;
  export default jStat;
}
