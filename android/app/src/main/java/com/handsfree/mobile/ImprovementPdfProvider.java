package com.handsfree.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Read-only, temporary URI grant for one PDF explicitly shared by the user. */
public class ImprovementPdfProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    private File document(Uri uri) throws FileNotFoundException {
        String name=uri.getLastPathSegment();
        if(name==null || !uri.getPath().equals("/"+name) || !name.matches("[0-9a-fA-F-]{36}\\.pdf")) throw new FileNotFoundException();
        return new File(new File(getContext().getCacheDir(),"improvement-pdfs"),name);
    }
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode) throws FileNotFoundException {
        if(!"r".equals(mode))throw new FileNotFoundException();
        return ParcelFileDescriptor.open(document(uri),ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public String getType(Uri uri){return "application/pdf";}
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){
        try{File f=document(uri);String[] cols=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor c=new MatrixCursor(cols);Object[] row=new Object[cols.length];for(int i=0;i<cols.length;i++)row[i]=OpenableColumns.DISPLAY_NAME.equals(cols[i])?"KMT_개선제안서.pdf":OpenableColumns.SIZE.equals(cols[i])?f.length():null;c.addRow(row);return c;}catch(FileNotFoundException e){return null;}
    }
    @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
    @Override public int update(Uri u,ContentValues v,String w,String[] a){throw new UnsupportedOperationException();}
    @Override public int delete(Uri u,String w,String[] a){throw new UnsupportedOperationException();}
}
