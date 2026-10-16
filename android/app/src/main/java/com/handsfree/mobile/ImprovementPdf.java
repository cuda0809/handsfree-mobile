package com.handsfree.mobile;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.webkit.WebView;
import android.widget.Toast;
import java.io.File;
import java.util.UUID;

final class ImprovementPdf {
    private boolean busy;
    void export(Activity activity,WebView view,boolean share){
        if(busy)return;
        PrintDocumentAdapter adapter=view.createPrintDocumentAdapter("KMT 개선제안서");
        if(!share){((PrintManager)activity.getSystemService(Activity.PRINT_SERVICE)).print("KMT 개선제안서",adapter,new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());return;}
        busy=true;
        PrintAttributes attrs=new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setResolution(new PrintAttributes.Resolution("pdf","PDF",300,300)).setMinMargins(PrintAttributes.Margins.NO_MARGINS).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build();
        adapter.onStart();
        adapter.onLayout(null,attrs,new CancellationSignal(),new PrintDocumentAdapter.LayoutResultCallback(){
            @Override public void onLayoutFinished(PrintDocumentInfo info,boolean changed){
                try{
                    File dir=new File(activity.getCacheDir(),"improvement-pdfs");if(!dir.exists()&&!dir.mkdirs())throw new Exception();
                    File[] old=dir.listFiles();if(old!=null)for(File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
                    File pdf=new File(dir,UUID.randomUUID()+".pdf");
                    ParcelFileDescriptor output=ParcelFileDescriptor.open(pdf,ParcelFileDescriptor.MODE_CREATE|ParcelFileDescriptor.MODE_TRUNCATE|ParcelFileDescriptor.MODE_READ_WRITE);
                    adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES},output,new CancellationSignal(),new PrintDocumentAdapter.WriteResultCallback(){
                        private void close(){try{output.close();}catch(Exception ignored){}adapter.onFinish();busy=false;}
                        @Override public void onWriteFinished(PageRange[] pages){close();if(pdf.length()==0){failed(activity);return;}Uri uri=Uri.parse("content://"+activity.getPackageName()+".documents/"+pdf.getName());Intent send=new Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM,uri);send.setClipData(ClipData.newRawUri("KMT 개선제안서",uri));send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);try{activity.startActivity(Intent.createChooser(send,"개선제안서 공유"));}catch(Exception e){failed(activity);}}
                        @Override public void onWriteFailed(CharSequence error){close();failed(activity);}
                        @Override public void onWriteCancelled(){close();}
                    });
                }catch(Exception e){adapter.onFinish();busy=false;failed(activity);}
            }
            @Override public void onLayoutFailed(CharSequence error){adapter.onFinish();busy=false;failed(activity);}
            @Override public void onLayoutCancelled(){adapter.onFinish();busy=false;}
        },null);
    }
    private void failed(Activity activity){Toast.makeText(activity,"PDF 준비에 실패했습니다. PDF 저장으로 다시 확인하세요.",Toast.LENGTH_LONG).show();}
}
